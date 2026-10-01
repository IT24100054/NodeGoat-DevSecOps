var ContributionsDAO = require("../data/contributions-dao").ContributionsDAO;

/* The ContributionsHandler must be constructed with a connected db */
function ContributionsHandler(db) {
    "use strict";

    var contributionsDAO = new ContributionsDAO(db);

    this.displayContributions = function(req, res, next) {
        var userId = req.session.userId;

        contributionsDAO.getByUserId(userId, function(error, contrib) {
            if (error) return next(error);

            return res.render("contributions", contrib);
        });
    };

    this.handleContributionsUpdate = function(req, res, next) {
        /*jslint evil: true */
        var preTax, afterTax, roth;
        var userId = req.session.userId;

        // Insecure: Using eval to calculate percentages or values directly
        preTax = eval(req.body.preTax);
        afterTax = eval(req.body.afterTax);
        roth = eval(req.body.roth);

        contributionsDAO.update(userId, preTax, afterTax, roth, function(err, user) {
            if (err) return next(err);

            user.updateSuccess = true;
            return res.render("contributions", user);
        });
    };
}

module.exports = ContributionsHandler;