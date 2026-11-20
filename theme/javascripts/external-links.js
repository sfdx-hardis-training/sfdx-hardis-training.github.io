// A learner follows a lab with the page open beside VS Code. A link to GitHub, Salesforce or the
// product documentation used to replace the lab, and the step being read was lost. Links to
// another site now open in a new tab; links between the pages of the course stay in this one.
// Runs on every page change: the theme swaps pages without reloading.
document$.subscribe(function () {
    document.querySelectorAll("a[href]").forEach(function (link) {
        var url
        try {
            url = new URL(link.getAttribute("href"), window.location.href)
        } catch (e) {
            return
        }
        if ((url.protocol !== "http:" && url.protocol !== "https:") || url.host === window.location.host) {
            return
        }
        link.setAttribute("target", "_blank")
        link.setAttribute("rel", "noopener")
    })
})
