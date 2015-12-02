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
        users = text;
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

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function searchUsers(query, limit) {
    let matches = new Map();
    let escapedQuery = escapeRegExp(query);

    // Matches all lines/entries for users that contain
    // the queried string (case-insensitive).
    let reUser = new RegExp(".*" + escapedQuery + ".*", "gi");

    // Matches all fields that contain the queried string
    // inside the line/entry for a given user (case-insensetive).
    let reField = new RegExp("[^|]*" + escapedQuery + "[^|]*", "gi");

    for (let mUser; mUser = reUser.exec(users);) {
      let user = mUser[0];

      // Calculate a score for each match based on the largest
      // relatively longest case-insensetive match in any field.
      // So if the query matches exactly the username or real name
      // the score is 1, which is the highest possible score.
      // If the query is "foo" and the username is "foobar" the
      // score is 0.5 as only half of the characters match.
      let score = 0;
      for (let mField; mField = reField.exec(user);)
        score = Math.max(score, query.length / mField[0].length);

      reField.lastIndex = 0;
      matches.set(user, score);
    }

    // Return an array of all matched users, sorted
    // descendant by score, apply limit if applicable.
    let results = Array.from(matches.keys());
    results.sort((a, b) => matches.get(b) - matches.get(a));
    if (!isNaN(limit))
      results.splice(limit);
    return results;
  }

  // Intercept calls to the Trac user suggestion API, redirecting to a data URI
  // containing the results that we want to display.
  function proxySubjectsAPICalls (details) {
    let search = parseSearch(details.url);
    if (users && "q" in search) {
      let results = searchUsers(search["q"], search["limit"]);
      return {
        redirectUrl: ("data:text/plain;charset=utf-8;base64," +
                      btoa(unescape(encodeURIComponent(results.join("\n")))))
      };
    }
  }
  chrome.webRequest.onBeforeRequest.addListener(
    proxySubjectsAPICalls,
    { urls: ["https://issues.adblockplus.org/subjects?*"] },
    ["blocking"]
  );
}
