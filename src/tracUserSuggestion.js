var users;

// Attempt to fetch a list of users immediately, retrying every 30 seconds on
// failure. Once the list has been downloaded re-fetch it each time the user
// logs in or out of Trac in order to honour the EMAIL_VIEW permission.
function fetch_users()
{
  var initial_fetch = users === undefined;

  fetch("https://issues.adblockplus.org/subjects",
        { credentials: "include" }).then(
    response => response.ok ? response.text() : Promise.reject()
  ).then(
    text => {
      users = text;

      if (initial_fetch)
        chrome.cookies.onChanged.addListener(changeInfo => {
          if (changeInfo.cookie.name == "trac_auth")
            fetch_users();
        });
    },
    () => {
      if (initial_fetch)
        setTimeout(fetch_users, 30000);
    }
  );
}
fetch_users();

function decodeURIComponentPlus(encoded)
{
  return decodeURIComponent(encoded.replace(/\+/g, "%20"));
}

function parse_search(url)
{
  var params = new URL(url).search.substr(1).split("&");
  var search = {};

  for (var i = 0; i < params.length; i++) {
    var pair = params[i].split("=");
    search[decodeURIComponentPlus(pair[0])] = decodeURIComponentPlus(pair[1]);
  }

  return search;
}

function escapeRegExp(str)
{
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function search_users(query, limit)
{
  var matches = new Map();
  var escapedQuery = escapeRegExp(query);

  // Matches all lines/entries for users that contain
  // the queried string (case-insensitive).
  var reUser = new RegExp(".*" + escapedQuery + ".*", "gi");

  // Matches all fields that contain the queried string
  // inside the line/entry for a given user (case-insensetive).
  var reField = new RegExp("[^|]*" + escapedQuery + "[^|]*", "gi");

  for (var mUser; mUser = reUser.exec(users);) {
    var user = mUser[0];

    // Calculate a score for each match based on the largest
    // relatively longest case-insensetive match in any field.
    // So if the query matches exactly the username or real name
    // the score is 1, which is the highest possible score.
    // If the query is "foo" and the username is "foobar" the
    // score is 0.5 as only half of the characters match.
    var score = 0;
    for (var mField; mField = reField.exec(user);)
      score = Math.max(score, query.length / mField[0].length);

    reField.lastIndex = 0;
    matches.set(user, score);
  }

  // Return an array of all matched users, sorted
  // descendant by score, apply limit if applicable.
  var results = Array.from(matches.keys());
  results.sort((a, b) => matches.get(b) - matches.get(a));
  if (!isNaN(limit))
    results.splice(limit);
  return results;
}

// Intercept other calls to the users API
function proxy_subjects_api_calls (details)
{
  var search = parse_search(details.url);
  if (users && "q" in search)
  {
    var results = search_users(search["q"], search["limit"]);
    return {
      redirectUrl: ("data:text/plain;charset=utf-8;base64," +
                    btoa(unescape(encodeURIComponent(results.join("\n")))))
    };
  }
}
chrome.webRequest.onBeforeRequest.addListener(
  proxy_subjects_api_calls,
  { urls: ["https://issues.adblockplus.org/subjects?*"],
    types: ["xmlhttprequest"] },
  ["blocking"]
);
