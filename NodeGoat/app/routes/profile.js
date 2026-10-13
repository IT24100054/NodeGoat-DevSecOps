const ProfileDAO = require("../data/profile-dao").ProfileDAO;
const ESAPI = require("node-esapi");
const {
    environmentalScripts
} = require("../../config/config");

/* The ProfileHandler must be constructed with a connected db */
function ProfileHandler(db) {
    "use strict";

    const profile = new ProfileDAO(db);

    // Value for the "Google search this profile" link (URL-encoded, no scheme control)
    const buildSearchQuery = (name) => encodeURIComponent(String(name || ""));

    this.displayProfile = (req, res, next) => {
        const { userId } = req.session;

        profile.getByUserId(parseInt(userId), (err, doc) => {
            if (err) return next(err);

            doc.userId = userId;
            doc.website = ESAPI.encoder().encodeForHTML(doc.website);
            doc.firstNameSafeString = doc.firstName;
            doc.searchQuery = buildSearchQuery(doc.firstName);

            return res.render("profile", {
                ...doc,
                environmentalScripts
            });
        });
    };

    this.handleProfileUpdate = (req, res, next) => {
        const {
            firstName,
            lastName,
            ssn,
            dob,
            address,
            bankAcc,
            bankRouting
        } = req.body;

        const { userId } = req.session;

        // T5 (ReDoS) fix: anchored, no nested quantifier, linear-time matching
        const regexPattern = /^[0-9]+#$/;

        // allow numbers with a suffix of the # character, for example: '123456#'
        const testComplyWithRequirements = regexPattern.test(String(bankRouting));

        if (testComplyWithRequirements !== true) {
            const firstNameSafeString = firstName;

            return res.render("profile", {
                updateError: "Bank Routing number does not comply with requirements for format specified",
                firstNameSafeString,
                searchQuery: buildSearchQuery(firstName),
                lastName,
                ssn,
                dob,
                address,
                bankAcc,
                bankRouting,
                environmentalScripts
            });
        }

        profile.updateUser(
            parseInt(userId),
            firstName,
            lastName,
            ssn,
            dob,
            address,
            bankAcc,
            bankRouting,
            (err, user) => {
                if (err) return next(err);

                // WARNING: do not apply extra encoding here (it would be double-encoded in the view)
                user.updateSuccess = true;
                user.userId = userId;

                const firstNameSafeString = user.firstName;

                return res.render("profile", {
                    ...user,
                    firstNameSafeString,
                    searchQuery: buildSearchQuery(user.firstName),
                    environmentalScripts
                });
            }
        );
    };
}

module.exports = ProfileHandler;