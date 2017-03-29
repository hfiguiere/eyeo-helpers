(function() {
  "use strict";

  var options = {
    delay: 100,
    max: 5,
    matchSubset: false,
    // Redirecting requests originally intended for issues.adblockplus.org to
    // a data URI fails due to Access-Control-Allow-Headers. So we change the
    // original URL to use our eyeo-helpers.invalid domain instead, which we are
    // able to later redirect how we want.
    url: "https://eyeo-helpers.invalid/trac-user-suggestion"
  };

  var script = document.createElement("script");
  script.type = "text/javascript";
  script.text = '$(".ac_input").setOptions(' + JSON.stringify(options) + ');';
  document.body.appendChild(script);
}());
