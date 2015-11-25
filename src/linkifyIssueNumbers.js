// Description: Adds links for related issue numbers to code reviews.

(function(){
  'use strict';
  // Find sections with issue IDs and then linkify each issue ID.
  var sectionRe = /#\d+|Issues?\s+#?(?:\d+.\s*)+/gi;
  var header = document.querySelector('body div h2');
  var decoratedNode = document.createElement('span');
  decoratedNode.innerHTML = header.removeChild(header.lastChild).textContent.
    replace(sectionRe, function(matchingString) {
    return matchingString.replace(/\d+/g, function(issueID) {
      return '<a href="https://issues.adblockplus.org/ticket/' + issueID +
        '">' + issueID + '</a>';
    });
  });
  header.appendChild(decoratedNode);
})();

