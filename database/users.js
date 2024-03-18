const database = include('databaseConnection');

async function createUser(postData) {
	// let createUserSQL = `
	// 	INSERT INTO user
	// 	(username, password)
	// 	VALUES
	// 	(:user, :passwordHash);
	// `;

	let createUserSQL = `
		INSERT INTO user
		(username, password)
		VALUES
		('${postData.user}', '${postData.hashedPassword}');`;

	let params = {
		user: postData.user,
		passwordHash: postData.hashedPassword
	}
	
	try {
		// const results = await database.query(createUserSQL, params);
		const results = await database.query(createUserSQL);

        console.log("Successfully created user");
		console.log(results[0]);
		return true;
	}
	catch(err) {
		console.log("Error inserting user");
        console.log(err);
		return false;
	}
}

async function getUsers(postData) {
	let getUsersSQL = `
		SELECT username, password
		FROM user
		WHERE username = '${postData.username}' OR 1=1; -- ';
	`;
	
	try {
		const results = await database.query(getUsersSQL);

        console.log("Successfully retrieved users");
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error getting users");
        console.log(err);
		return false;
	}
}

async function getUser(postData) {
	// let getUserSQL = `
	// 	SELECT user_id, username, password, type
	// 	FROM user
	// 	JOIN user_type USING (user_type_id)
	// 	WHERE username = :user;
	// `;

	let getUserSQL = `
		SELECT user_id, username, password, type
		FROM user
		JOIN user_type USING (user_type_id)
		WHERE username = '${postData.user}';
	`;

	let params = {
		user: postData.user
	}
	
	try {
		// const results = await database.query(getUserSQL, params);
		const results = await database.query(getUserSQL);

        console.log("Successfully found user");
		console.log(results[0]);
		return results[0];
	}
	catch(err) {
		console.log("Error trying to find user");
        console.log(err);
		return false;
	}
}

module.exports = {createUser, getUsers, getUser};