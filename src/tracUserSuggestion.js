"use strict";

(function()
{
  const queries = "abcdefghijklmnopqrstuvwxyz01234567890=-_".split("");

  let users = null;

  // Perform a user search, retrying every 30 seconds on failure
  function performQuery(query)
  {
    let url = "https://issues.adblockplus.org/subjects?q=" +
                encodeURIComponent(query) + "&limit=10&timestamp=" +
                new Date().valueOf();
    return fetch(url, {credentials: "include"}).then(
      response => response.ok ? response.text() : Promise.reject()
    );
  }

  function fetchUsers()
  {
    Promise.all(queries.map(performQuery)).then(responses =>
    {
      // Remove duplicates
      let uniqueUsers = new Set();
      for (let response of responses)
      {
        let start = 0;
        let end = response.indexOf("\n");

        while (end > -1)
        {
          uniqueUsers.add(response.substring(start, end));
          start = end + 1;
          end = response.indexOf("\n", start);
        }
      }

      // Sort
      let text = Array.from(uniqueUsers).sort().join("\n");

      users = {original: text, lowerCase: text.toLowerCase()};
    });
  }
  fetchUsers();

  // Refresh our users list when logging in / out of Trac. (We do this in order
  // to honour the EMAIL_VIEW Trac permission.)
  chrome.cookies.onChanged.addListener(changeInfo =>
  {
    if (changeInfo.cookie.domain == "issues.adblockplus.org" &&
        changeInfo.cookie.name == "trac_auth" && users != null)
      fetchUsers();
  });

  function decodeURIComponentPlus(encoded)
  {
    return decodeURIComponent(encoded.replace(/\+/g, "%20"));
  }

  function parseSearch(url)
  {
    let params = new URL(url).search.substr(1).split("&");
    let search = {};

    for (let param of params)
    {
      let pair = param.split("=");
      search[decodeURIComponentPlus(pair[0])] = decodeURIComponentPlus(pair[1]);
    }

    return search;
  }

  function findPositions(text, query, boundary)
  {
    // Optimization: Note that this function could better be implemented
    // as generator. However, V8 cannot optimize generator functions yet.
    let offset = 0;
    let positions = [];

    while (true)
    {
      let pos = text.indexOf(query, offset);
      if (pos == -1)
        break;

      let start = text.lastIndexOf(boundary, pos);
      if (start == -1)
        start = 0;
      else
        /* eslint-disable operator-assignment */
        // Optimization: V8 cannot optimize functions using compound
        // assignment on block-scoped variables. So we avoid += here.
        start = start + boundary.length;
        /* eslint-enable operator-assignment */

      let end = text.indexOf(boundary, pos + query.length);
      if (end == -1)
        end = text.length;

      positions.push({start, end});
      offset = end + boundary.length;
    }

    return positions;
  }

  function searchUsers(query, limit)
  {
    let matches = Object.create(null);
    let lowerCaseQuery = query.toLowerCase();

    let originalUsers = users.original;
    let lowerCaseUsers = users.lowerCase;

    for (let posUser of findPositions(lowerCaseUsers, lowerCaseQuery, "\n"))
    {
      let originalUser = originalUsers.substring(posUser.start, posUser.end);
      let lowerCaseUser = lowerCaseUsers.substring(posUser.start, posUser.end);

      // Calculate a score for each match based on the largest
      // relatively longest case-insensitive match in any field.
      // So if the query matches exactly the username or real name
      // the score is 1, which is the highest possible score.
      // If the query is "foo" and the username is "foobar" the
      // score is 0.5 as only half of the characters match.
      let score = 0;
      for (let posField of findPositions(lowerCaseUser, lowerCaseQuery, "|"))
        score = Math.max(score, query.length / (posField.end - posField.start));

      matches[originalUser] = score;
    }

    let results = Object.getOwnPropertyNames(matches);
    results.sort((a, b) => matches[b] - matches[a]);

    if (!isNaN(limit))
      results.splice(limit);

    return results;
  }

  // Intercept calls to the Trac user suggestion API, redirecting to a data URI
  // containing the results that we want to display.
  function proxySubjectsAPICalls(details)
  {
    let search = parseSearch(details.url);
    let results;

    if (!(users && search.q))
    {
      // We don't have anything to suggest since either the users list hasn't
      // finished downloading or there was no query.
      results = [];
    }
    else
      results = searchUsers(search["q"], search["limit"]);

    return {
      redirectUrl: ("data:text/plain;charset=utf-8;base64," +
                    btoa(unescape(encodeURIComponent(results.join("\n")))))
    };
  }
  chrome.webRequest.onBeforeRequest.addListener(
    proxySubjectsAPICalls,
    {urls: ["https://eyeo-helpers.invalid/trac-user-suggestion?*"]},
    ["blocking"]
  );
}());
