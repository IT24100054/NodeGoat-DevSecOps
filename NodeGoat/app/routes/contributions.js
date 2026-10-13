const ContributionsDAO = require("../data/contributions-dao").ContributionsDAO;

/* The ContributionsHandler must be constructed with a connected db */
function ContributionsHandler(db) {
    "use strict";

    const contributionsDAO = new ContributionsDAO(db);

    this.displayContributions = (req, res, next) => {
        const { userId } = req.session;

        contributionsDAO.getByUserId(userId, (error, contrib) => {
            if (error) return next(error);

            contrib.userId = userId; // set for nav menu items
            return res.render("contributions", contrib);
        });
    };

    this.handleContributionsUpdate = (req, res, next) => {
        const { userId } = req.session;

        // Strict integer parsing: no eval, and "5abc" or "1+1" are rejected
        const toPercent = (value) => {
            const s = String(value === undefined ? "" : value).trim();
            return /^\d{1,3}$/.test(s) ? parseInt(s, 10) : NaN;
        };

        const preTax = toPercent(req.body.preTax);
        const afterTax = toPercent(req.body.afterTax);
        const roth = toPercent(req.body.roth);

        if ([preTax, afterTax, roth].some(Number.isNaN)) {
            return res.render("contributions", {
                updateError: "Invalid contribution percentages",
                userId
            });
        }

        // Prevent more than 30% contributions
        if (preTax + afterTax + roth > 30) {
            return res.render("contributions", {
                updateError: "Contribution rate exceeds 30%",
                userId
            });
        }

        contributionsDAO.update(userId, preTax, afterTax, roth, (err, contributions) => {
            if (err) return next(err);

            contributions.updateSuccess = true;
            return res.render("contributions", contributions);
        });
    };
}

module.exports = ContributionsHandler;