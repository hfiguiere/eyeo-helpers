var users;

// Grab a list of all users
function fetch_users()
{
  fetch("https://issues.adblockplus.org/subjects",
        { credentials: "include" }).then(
    response => response.ok ? response.text() : Promise.reject()
  ).then(
    text => {
      users = text.split("\n");
    },
    () => {
      setTimeout(fetch_users, 30000);
    }
  );
}
fetch_users();

function parse_search(url)
{
  var params = new URL(url).search.substr(1).split("&");
  var search = {};

  for (var i = 0; i < params.length; i++) {
    var pair = params[i].split("=");
    search[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }

  return search;
}

function search_users(query, limit)
{
  limit = parseInt(limit);
  if (isNaN(limit))
    limit = 10;

  var groupings = [];
  for (var i = 0; i < users.length; i += 1)
  {
    var pos = users[i].indexOf(query);
    if (pos > -1)
    {
      if (!(pos in groupings))
        groupings[pos] = [users[i]];
      else
      {
        groupings[pos].push(users[i]);
        if (pos == 0 && groupings[0].length == limit)
          return groupings[0];
      }
    }
  }

  var results = [];
  for (var i = 0; i < groupings.length; i += 1)
  {
    if (i in groupings)
    {
      results = results.concat(groupings[i]);
      if (results.length >= limit)
        return results.slice(0, limit);
    }
  }
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
