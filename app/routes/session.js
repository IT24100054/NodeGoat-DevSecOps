var UserDAO = require("../data/user-dao").UserDAO;
var AllocationsDAO = require("../data/allocations-dao").AllocationsDAO;

/* The SessionHandler must be constructed with a connected db */
function SessionHandler(db) {
    "use strict";

    var userDAO = new UserDAO(db);
    var allocationsDAO = new AllocationsDAO(db);

    var prepareUserData = function(user, next) {
        // Generate allocations data
        allocationsDAO.getByUserId(user._id, function(err, allocations) {
            if (err) return next(err);
            user.allocations = allocations;
            next(null, user);
        });
    };

    this.isAdminUserMiddleware = function(req, res, next) {
        if (req.session.userId) {
            return userDAO.getUserById(req.session.userId, function(err, user) {
                if (user && user.isAdmin) {
                    return next();
                }
                return res.redirect("/login");
            });
        }
        return res.redirect("/login");
    };

    this.isLoggedInMiddleware = function(req, res, next) {
        if (req.session.userId) {
            return next();
        }
        return res.redirect("/login");
    };

    this.displayLoginPage = function(req, res, next) {
        return res.render("login", {
            userName: "",
            password: "",
            loginError: ""
        });
    };

    this.handleLoginRequest = function(req, res, next) {
        var userName = req.body.userName;
        var password = req.body.password;

        userDAO.validateLogin(userName, password, function(err, user) {
            var errorMessage = "Invalid username and/or password";

            if (err) {
                if (err.noSuchUser) {
                    return res.render("login", {
                        userName: userName,
                        password: "",
                        loginError: errorMessage
                    });
                } else if (err.invalidPassword) {
                    return res.render("login", {
                        userName: userName,
                        password: "",
                        loginError: errorMessage
                    });
                } else {
                    return next(err);
                }
            }

            req.session.userId = user._id;
            return res.redirect(user.isAdmin ? "/benefits" : "/dashboard");
        });
    };

    this.displayLogoutPage = function(req, res, next) {
        req.session.destroy(function() {
            res.redirect("/");
        });
    };

    this.displaySignupPage = function(req, res, next) {
        res.render("signup", {
            userName: "",
            password: "",
            passwordError: "",
            email: "",
            userNameError: "",
            emailError: "",
            verifyError: ""
        });
    };

    function validateSignup(username, password, verify, email, errors) {
        var USER_RE = /^[a-zA-Z0-9_-]{3,20}$/;
        var PASS_RE = /^.{3,20}$/;
        var EMAIL_RE = /^[\S]+@[\S]+\.[\S]+$/;

        errors.userNameError = "";
        errors.passwordError = "";
        errors.verifyError = "";
        errors.emailError = "";

        if (!USER_RE.test(username)) {
            errors.userNameError = "invalid username.";
            return false;
        }
        if (!PASS_RE.test(password)) {
            errors.passwordError = "invalid password.";
            return false;
        }
        if (password !== verify) {
            errors.verifyError = "password must match";
            return false;
        }
        if (email !== "") {
            if (!EMAIL_RE.test(email)) {
                errors.emailError = "invalid email address";
                return false;
            }
        }
        return true;
    }

    this.handleSignup = function(req, res, next) {
        var email = req.body.email;
        var userName = req.body.userName;
        var password = req.body.password;
        var verify = req.body.verify;

        var errors = {
            userName: userName,
            email: email
        };

        if (validateSignup(userName, password, verify, email, errors)) {
            userDAO.getUserByUserName(userName, function(err, user) {
                if (err) return next(err);

                if (user) {
                    errors.userNameError = "User name already in use. Please choose another";
                    return res.render("signup", errors);
                }

                userDAO.addUser(userName, password, email, function(err, user) {
                    if (err) return next(err);

                    // Fix session fixation
                    req.session.regenerate(function() {
                        req.session.userId = user._id;
                        res.redirect("/dashboard");
                    });
                });
            });
        } else {
            console.log("user did not validate");
            return res.render("signup", errors);
        }
    };

    this.displayWelcomePage = function(req, res, next) {
        var userId = req.session.userId;

        userDAO.getUserById(userId, function(err, doc) {
            if (err) return next(err);
            doc.userId = userId;
            res.render("welcome", doc);
        });
    };
}

module.exports = SessionHandler;