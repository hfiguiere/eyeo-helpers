// Grab a list of all users
var users;
var request = new XMLHttpRequest();
request.onreadystatechange = function() {
  if (request.readyState === 4 &&
      request.status > 199 && request.status < 300)
    users = request.responseText.split("\n");
};
request.open("GET", "https://issues.adblockplus.org/subjects", true);
request.send(null);

function parse_search(url)
{
  var search = {};
  var a = document.createElement('a');
  a.href = url;

  if (a.search)
  {
    a.search.substr(1).split("&").map(function(parameter) {
      var key_val = parameter.split("=", 2);
      search[key_val[0]] = key_val[1];
    });
  }
  return search;
}

function search_users(query, limit)
{
  if (!limit)
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
  if ("q" in search)
  {
    var results = search_users(search["q"], search["limit"]);
    if (results)
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
