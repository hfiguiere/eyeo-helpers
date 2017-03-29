"use strict";

{
  let users = null;

  // Fetch the list of users, retrying every 30 seconds on failure
  function fetchUsers() {
    fetch("https://issues.adblockplus.org/subjects",
          { credentials: "include" }).then(
      response => response.ok ? response.text() : Promise.reject()
    ).then(
      text => {
        users = {original: text, lowerCase: text.toLowerCase()};
      },
      () => {
        setTimeout(fetchUsers, 30000);
      }
    );
  }
  fetchUsers();

  // Refresh our users list when logging in / out of Trac. (We do this in order
  // to honour the EMAIL_VIEW Trac permission.)
  chrome.cookies.onChanged.addListener(changeInfo => {
    if (changeInfo.cookie.domain == "issues.adblockplus.org" &&
        changeInfo.cookie.name == "trac_auth" && users != null)
      fetchUsers();
  });

  function decodeURIComponentPlus(encoded) {
    return decodeURIComponent(encoded.replace(/\+/g, "%20"));
  }

  function parseSearch(url) {
    let params = new URL(url).search.substr(1).split("&");
    let search = {};

    for (let param of params) {
      let pair = param.split("=");
      search[decodeURIComponentPlus(pair[0])] = decodeURIComponentPlus(pair[1]);
    }

    return search;
  }

  function findPositions(text, query, boundary) {
    // Optimization: Note that this function could better be implemented
    // as generator. However, V8 cannot optimize generator functions yet.
    let offset = 0;
    let positions = [];

    while (true) {
      let pos = text.indexOf(query, offset);
      if (pos == -1)
        break;

      let start = text.lastIndexOf(boundary, pos);
      if (start == -1)
        start = 0;
      else
        // Optimization: V8 cannot optimize functions using compound
        // assignment on block-scoped variables. So we avoid += here.
        start = start + boundary.length;

      let end = text.indexOf(boundary, pos + query.length);
      if (end == -1)
        end = text.length;

      positions.push({start, end});
      offset = end + boundary.length;
    }

    return positions;
  }

  function searchUsers(query, limit) {
    let matches = Object.create(null);
    let lowerCaseQuery = query.toLowerCase();

    let originalUsers  = users.original;
    let lowerCaseUsers = users.lowerCase;

    for (let posUser of findPositions(lowerCaseUsers, lowerCaseQuery, "\n")) {
      let originalUser  =  originalUsers.substring(posUser.start, posUser.end);
      let lowerCaseUser = lowerCaseUsers.substring(posUser.start, posUser.end);

      // Calculate a score for each match based on the largest
      // relatively longest case-insensetive match in any field.
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
  function proxySubjectsAPICalls (details) {
    let search = parseSearch(details.url);
    let results;

    if (!users)
    {
      // We haven't finished downloading the users list, so don't suggest any.
      results = [];
    }
    else if (!("q" in search))
    {
      // There was no query, so we can just return all users.
      if (!isNaN(search["limit"]))
        results = users.original.slice(0, search["limit"]);
      else
        results = users.original;
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
    { urls: ["https://eyeo-helpers.invalid/trac-user-suggestion?*"] },
    ["blocking"]
  );
}
