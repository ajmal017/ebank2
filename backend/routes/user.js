/*
 * License: The MIT License (MIT)
 * Author:E-bank IT team
 * Author email: @ebanka-it.com
 * Date: Fri Aug 23 2019
 * Description:
 * Main user back-end user handler.
 * Has the following methods:
 * 1. /signup -> hash user function,
 *            -> save user data in mongoDB
 *            -> create new bank client with random data and insert it into MySQL db
 *            -> get random user data (homeaddress, number...) from Django server and update user in MongoDB
 * 2. /login
 * 3. Functions to create/get bank client data and its transactions
 * 4. Current date/time stamp function
 */

const express = require("express");
const User = require("../models/user");
const Account = require("../models/account");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const checkAuth = require('../middleware/check-auth');
const fetch = require("node-fetch");

router.post("/signup", (req, res, next) => {

    //We hash password with salt value of 10 (recommended optimal value)
    bcrypt.hash(req.body.password, 10).then(hash => {
        let user = {
            //supplier: front-end
            email: req.body.email,
            password: hash,
            name: req.body.name,
            surname: req.body.surname,

            //supplier: mySQL db
            defaultAccountID: 1,

            //supplier: Django API
            address: '',
            number: '',
            hnumber: '',

            //generate user.js
            dateRegistered: getDateTimeNow(),
            lastLogin: "0000-00-00"
        }
        let accountID;
        accountsAddEmpty(2) // insert empty account in db (points to demo user) and return defaultAccountID
            .then(newAccountID => {
                accountID = newAccountID;
                fetch('http://127.0.0.1:3002/randomUserData/random/')
                    .then(function(res) {
                        return res.json();
                    })
                    .then(function(userPython) {
                        if (!userPython) {
                            console.log("Django server fetch fail!");
                        }
                        user.address = userPython.address;
                        user.number = userPython.number;
                        user.hnumber = userPython.hnumber;
                        user.defaultAccountID = newAccountID;
                        userAddEmpty(user).then(newUser => { // insert new user in db (points to new acc.)
                            if (!newUser) {
                                console.log("Error - null value of newUser!");
                            }
                            accountsUpdateUserID(accountID, newUser).then(result => {
                                usersUpdateAccountID(accountID, newUser).then(result => {});
                            }); // update account with new userID
                        });
                    }).catch(err => {
                        console.log(err);
                    });
                res.status(201).json({
                    message: "New user created!",
                    //result: result
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: err
                });
                //console.log(newUser);
            });
    });
});

router.post("/login", (req, res, next) => {
    let fetchedUser;
    userFindByEmail(req.body.email).then(user => {
            if (!user) {
                return res.status(401).json({ message: "Login unsuccessful!" });
            }
            fetchedUser = user[0];
            return bcrypt.compare(req.body.password, user[0].password);
        })
        .then(result => {
            if (!result) {
                return res.status(401).json({ message: "Login unsuccessful!" })
            }

            const token = jwt.sign({ email: fetchedUser.email, userId: fetchedUser.userID },
                "MK@#E3neUXNyQCB%NwPj$W_Apa=uB^^Ebkh7&vVL4v@a8JR^&?@HqSy?XCkr+XkeD^dxQWXD^$t?MbT5VxTP?uUU@PUhZ+q$MHxJBMdafehExnwgDwDvnnSSRqCPxgG!hcPRkgvj6u?ua$-S*yJM63%r9Gf2q$t-GhtP?QRgUSpdCQ5@*KL?Dzxs7mH&dhs-6_m7KzWk_vg5#8c=DS*=WA#e4&KxFet3v7_*3E@W@3B@59Ts_RwUW^CursCCJY7C9X!kyxGy-LN!T", { expiresIn: '1h' });
            res.status(200).json({ token: token, expiresIn: 3600, userId: fetchedUser.userID });
            userUpdateLoginTime(fetchedUser.userID, getDateTimeNow()).then(res => {})
        }).catch(err => {
            return res.status(401).json({
                message: "Login unsuccessful!"
            });
        });
});

router.get('/dash/:id', checkAuth, (req, res, next) => {
    userFindById(req.params.id).then(user => {
        if (user) {
            accountsFindFirstOneByUserId(req.params.id).then(resolution => {
                const userCombinedData = {
                    name: user.name,
                    surname: user.surname,
                    limitMonthly: resolution[0].limitMonthly,
                    usedLimit: resolution[0].usedLimit,
                    clientNumber: resolution[0].accountID,
                    branch: resolution[0].branch,
                    balance: resolution[0].currentBalance,
                    transactions: resolution.transactions
                }
                res.status(200).json(userCombinedData);
            });
        } else {
            res.status(404).json({ message: 'User not found!' });
        }
    });
});

var userUpdateLoginTime = function(userID, timestamp) {
    return new Promise(function(resolve, reject) {
        /*
         * We carry out protection against SQL injection attacks.
         * The key (userID) which should be inserted in SQL query
         * is appended as a function parameter and NOT as a part of
         * query string. */
        let queryNode = `
          UPDATE user
          SET
            lastLogin = "${timestamp}"
          WHERE
            userID = ?`;
        Account.query(queryNode, [userID], (err, results, fields) => {
            let res = results;
            if (err) {
                reject(console.log(err.message));
            }
            resolve(res);
        });
    });
}

var userFindByEmail = function(userEmail) {
    return new Promise(function(resolve, reject) {
        /*
         * We carry out protection against SQL injection attacks.
         * The key (userID) which should be inserted in SQL query
         * is appended as a function parameter and NOT as a part of
         * query string. */
        let queryNode = `
  SELECT
    userID,
    name,
    surname,
    email,
    password,
    defaultAccountID
  FROM
    ebank.user
  WHERE
    email = ?`

        Account.query(queryNode, [userEmail], (err, results, fields) => {
            let res = results;
            if (err) {
                reject(console.log(err.message));
            }
            resolve(res);
        });
    });
}

var userFindById = function(userID) {
    return new Promise(function(resolve, reject) {
        /*
         * We carry out protection against SQL injection attacks.
         * The key (userID) which should be inserted in SQL query
         * is appended as a function parameter and NOT as a part of
         * query string. */
        let queryNode = `
SELECT
  name,
  surname,
  defaultAccountID
FROM
  ebank.user
WHERE
  userID = ?`

        Account.query(queryNode, [userID], (err, results, fields) => { // the param. [userID] is the param. to be inserterd in query
            let res = results;
            if (err) {
                reject(console.log(err.message));
            }
            resolve(res[0]);
        });
    });
}

var userAddEmpty = function(user) {
    return new Promise(function(resolve, reject) {
        // this should be implemented as MySQL procedure call rather then direct query call
        let queryNode = `INSERT INTO user
  (
    email,
    password,
    name,
    surname,
    number,
    address,
    hnumber,
    dateRegistered,
    defaultAccountID
  )
  VALUES
  (
    "${user.email}",
    "${user.password}",
    "${user.name}",
    "${user.surname}",
    "${user.number}",
    "${user.address}",
    "${user.hnumber}",
    "${getDateTimeNow()}",
    183
  )`;

        Account.query(queryNode, (err, results, fields) => {
            let res = results;
            if (err) {
                reject(console.log(err.message));
            }
            resolve(res.insertId);
        });
    });
}

function getDateTimeNow() {
    let now = new Date();
    let dateOpened =
        now.getFullYear() + '-' +
        (now.getMonth() + 1) + '-' +
        now.getDate() + ' ' +
        now.getHours() + ':' +
        now.getMinutes() + ':' +
        now.getSeconds();
    return dateOpened;
}

var accountsAddEmpty = function(userId) {
    return new Promise(function(resolve, reject) {
        // this should be implemented as MySQL procedure call rather then direct query call
        let queryNode = `INSERT INTO account
  (
  currentBalance,
  garnishment,
  currencyID,
  dateOpened,
  dateClosed,
  userID
  )
  VALUES
  (
    "${Math.floor(Math.random() * (100000 - 30000) ) + 30000}",
    0,
    1,
    "${getDateTimeNow()}",
    "0000-00-00",
    "${userId}"
  )`;

        Account.query(queryNode, (err, results, fields) => {
            if (err) {
                reject(console.log(err.message));
            }
            resolve(results.insertId);
        });
    });
}

usersUpdateAccountID = function(accountID, userID) {
    return new Promise(function(resolve, reject) {
        /*
         * We carry out protection against SQL injection attacks.
         * The key (userID) which should be inserted in SQL query
         * is appended as a function parameter and NOT as a part of
         * query string. */
        let queryNode = `
      UPDATE user
      SET
        defaultAccountID = "${accountID}"
      WHERE
        userID = ?`;
        Account.query(queryNode, [userID], (err, results, fields) => {
            let res = results;
            if (err) {
                reject(console.log(err.message));
            }
            resolve(res);
        });
    });
}

accountsUpdateUserID = function(accountID, userID) {
    return new Promise(function(resolve, reject) {
        /*
         * We carry out protection against SQL injection attacks.
         * The key (userID) which should be inserted in SQL query
         * is appended as a function parameter and NOT as a part of
         * query string. */
        let queryNode = `
    UPDATE account
    SET
      userID = "${userID}"
    WHERE
      accountID = ?`;
        Account.query(queryNode, [accountID], (err, results, fields) => {
            let res = results;
            if (err) {
                reject(console.log(err.message));
            }
            resolve(res);
        });
    });
}

var accountsFindFirstOneByUserId = function(userID) {
    return new Promise(function(resolve, reject) {
        /*
         * We carry out protection against SQL injection attacks.
         * The key (userID) which should be inserted in SQL query
         * is appended as a function parameter and NOT as a part of
         * query string. */
        let queryNode = `
    SELECT
     accountID,
     branch,
     limitMonthly,
     usedLimit,
     currentBalance
    FROM
     ebank.account
    WHERE
     userID = ?
    ORDER BY accountID
    LIMIT 1;
     `
        Account.query(queryNode, [userID], (err, results, fields) => { // the param. [userID] is the param. to be inserterd in query
            let res = results;
            if (err) {
                reject(console.log(err.message));
            }
            userGetTransactionsByAccountID(res[0].accountID).then(trans => {
                res = Object.assign({ transactions: { trans } }, res);
                resolve(res);
            }).catch(err => {
                console.log(err)
            });
        });
    });
}

var userGetTransactionsByAccountID = function(accountID) {
    return new Promise(function(resolve, reject) {
        /*
         * We carry out protection against SQL injection attacks.
         * The key (userID) which should be inserted in SQL query
         * is appended as a function parameter and NOT as a part of
         * query string. */
        let queryNode = `
        SELECT
          date,
          senderAccountNumber,
          amount,
          receiverAccountNumber,
          dateKnjizenja,
          paymentMethod,
          description
        FROM
          ebank.transaction
        WHERE
          senderAccountNumber = ?
        ORDER BY date DESC
        LIMIT 10;
        `
        Account.query(queryNode, [accountID], (err, results, fields) => {
            let res = results;
            if (err) {
                reject(console.log(err.message));
            }
            resolve(res);
        });
    });
}
module.exports = router;