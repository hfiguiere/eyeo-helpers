"use strict";

// Description: Adds links for related issue numbers to code reviews.

(function()
{
  // Find sections with issue IDs and then linkify each issue ID.
  let sectionRe = /#\d+|Issues?\s+#?(?:\d+.\s*)+/gi;
  let header = document.querySelector("body div h2");
  let decoratedNode = document.createElement("span");
  decoratedNode.innerHTML = header.removeChild(header.lastChild).textContent
    .replace(
      sectionRe,
      matchingString => matchingString.replace(
        /\d+/g,
        issueID => "<a href=\"https://issues.adblockplus.org/ticket/" +
                   issueID + "\">" + issueID + "</a>"
      )
    );
  header.appendChild(decoratedNode);
}());

