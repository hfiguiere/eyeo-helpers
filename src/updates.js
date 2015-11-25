function strip_content_type_options(details)
{
  details.responseHeaders.forEach(function (header, i) {
    if (header.name === "X-Content-Type-Options")
      details.responseHeaders.splice(i, 1);
  });
  return {
    responseHeaders: details.responseHeaders
  };
}

chrome.webRequest.onHeadersReceived.addListener(
  strip_content_type_options,
  { urls: ["https://raw.githubusercontent.com/kzar/eyeo-helpers/master/*"] },
  ["responseHeaders", "blocking"]
);
