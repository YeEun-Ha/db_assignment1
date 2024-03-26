require('./utils');

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;


const database = include('databaseConnection');
const db_utils = include('database/db_utils');
const db_users = include('database/users');
const success = db_utils.printMySQLVersion();


const port = process.env.PORT || 3030;

const app = express();

const expireTime = 1 * 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)

// var users = [];

// /* secret information section */
// const mongodb_user = "hye829900";
// const mongodb_password = "WCdK5lG0ooVCw73s";
// const node_session_secret = "f0d5359e-2d72-4f8f-8959-b1354a543271";
// const mongodb_session_secret ="f6fbec89-7c15-4c72-af0f-696990e1da0d";

const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
// /* END secret section */

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/Views'));  


app.use(express.urlencoded({extended: false}));
// console.log(`mongodb+srv://${mongodb_user}:${mongodb_password}@cluster0.dqd1fyd.mongodb.net/sessions`)

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@cluster0.dqd1fyd.mongodb.net/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
})

app.use(session({ 
    secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true    
}
));

// ------------------------------------------------------------------------


app.get('/', (req,res) => {
    // res.send("<h1>Hello World!</h1>");
    if (req.session.username) {
        res.render("loggedin", {username: req.session.username, port: port});
    } else{
        res.render("login", {port: port});
    }
});

app.get('/signup', (req,res) => {
    var missingUsername = req.query.missingName;
    var missingPassword = req.query.missingPass;
    var missingBoth = req.query.missingBoth;

    // var html = `
    // <form action='/submitUser' method='post'>
    // <input name='username' type='text' placeholder='username'>
    // <input name='password' type='password' placeholder='password'>
    // <button>Submit</button>
    // </form>
    // `;
    
    // res.send(html);
    res.render("createUser", {missingName: missingUsername, missingPass: missingPassword, missingBoth: missingBoth});
}); 


app.post('/submitUser', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;

    if (!username || !password) {       
        if (!username && !password) {
            res.redirect('/signup?missingBoth=1');
        } else if(!username) {
            res.redirect('/signup?missingName=1');
        } else if (!password){
            res.redirect('/signup?missingPass=1');  
        }
        return
    }

    // users.push({ username: username, password: password });

    var hashedPassword = bcrypt.hashSync(password, saltRounds);

    // users.push({ username: username, password: hashedPassword });

    // var usershtml = "";
    // for (i = 0; i < users.length; i++) {
    //     usershtml += "<li>" + users[i].username + ": " + users[i].password + "</li>";
    // }
    // var html = "<ul>" + usershtml + "</ul>";
    // res.send(html);


    var success = await db_users.createUser({ user: username, hashedPassword: hashedPassword });

    if (success) {
        // var results = await db_users.getUsers();

        // // res.render("submitUser",{users:users});
        // res.render("submitUser",{users:results});
        res.redirect('/login');
    }
    else {
        res.render("errorMessage", {error: "Failed to create user."} );
    }
});


app.get('/login', (req,res) => {
    var loginFail = req.query.badlogin;
    // var html = `
    // log in
    // <form action='/loggingin' method='post'>
    // <input name='username' type='text' placeholder='username'>
    // <input name='password' type='password' placeholder='password'>
    // <button>Submit</button>
    // </form>
    // `;
    // res.send(html);

    res.render("login", {failedLogin: loginFail});
});


app.post('/loggingin', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;

    // var usershtml = "";
    // for (i = 0; i < users.length; i++) {
    //     if (users[i].username == username) {
    //         if (bcrypt.compareSync(password, users[i].password)) {
    var results = await db_users.getUser({ user: username, hashedPassword: password });
    if (results) {
        if (results.length == 1) { //there should only be 1 user in the db that matches
            if (bcrypt.compareSync(password, results[0].password)) {
                req.session.authenticated = true;
                req.session.username = username;
                req.session.user_type = results[0].type;
                req.session.cookie.maxAge = expireTime;

                res.redirect('/loggedIn');
                return;
            }
            else{
                console.log("invalid password");
            }
        }
        else {
            console.log('invalid number of users matched: '+results.length+" (expected 1).");
            res.redirect('/login?badlogin=1');
            return;            
        }
    }

    console.log('user not found');

    //user and password combination not found
    res.redirect("/login?badlogin=1");
});

app.use('/loggedin', sessionValidation);

app.get('/loggedin', (req,res) => {
    // if (!req.session.authenticated) {
    //     res.redirect('/login');
    // }
    
    // var html = `
    // You are logged in! :D
    // `;
    // res.send(html);
    res.render("loggedin", {port: port, username: req.session.username});
});


app.use('/members', sessionValidation);

app.get('/members', (req,res) => {
    let randomNum = Math.floor(Math.random() * 3) + 1;
    res.render("formembers", {port: port, username: req.session.username, user_type: req.session.user_type, randomNum: randomNum});
});


app.get('/logout', (req,res) => {
    req.session.destroy(e => {
        if (e) {
            console.log("error destroying session: ", e);
        }
        res.redirect('/');
    });
});


function isValidSession(req) {
	if (req.session.authenticated) {
		return true;
	}
	return false;
}

function sessionValidation(req, res, next) {
	if (!isValidSession(req)) {
		req.session.destroy();
		res.redirect('/');
		return;
	}
	else {
		next();
	}
}

function isAdmin(req) {
    if (req.session.user_type == 'admin') {
        return true;
    }
    return false;
}

function adminAuthorization(req, res, next) {
	if (!isAdmin(req)) {
        res.status(403);
        res.render("errorMessage", {error: "Not Authorized"});
        return;
	}
	else {
		next();
	}
}


// app.use(express.static(__dirname + "/../public"));
app.use(express.static(__dirname + "/public"));

app.get("*", (req,res) => {
	res.status(404);
    // res.send("Page not found - 404 :D");
	res.render("404");
})

app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 
