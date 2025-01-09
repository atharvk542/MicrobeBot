//will store the code for managing the global incorrect question database for all users

//db architecture - primary key userid, field microbe, integer amount
//there will be multiple entries of the same userid, but diffrent microbes and amount of times they got the microbe incorrect
//on user addition, all microbes will be initialized to 0

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
let sql;

//connect to DB
const db = new sqlite3.Database(path.join(__dirname, 'incorrectMicrobeList.db'), sqlite3.OPEN_READWRITE, (err) => {
    if (err) {return console.error(err.message);}
    else {
        console.log("Connected to the database");
        db.run(
            `CREATE TABLE IF NOT EXISTS incorrectMicrobeList (
            id INTEGER NOT NULL,
            microbe TEXT NOT NULL,
            amount INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (id, microbe)
            )`
        , (err) => {
            if(err) {
                console.error('error creating table:', err.message);
            } else {
                console.log("incorrectMicrobeList created or existed");
            }
        });
    }
});

//adds a user into the database and initializes all microbes in the database to 0 so that they are ready to increment
function addUserIncorrectMicrobeList(userId) {
    const microbeDict = JSON.parse(fs.readFileSync('commands/utility/dictionaries/microbetypes.json', 'utf8'));
    const microbes = Object.keys(microbeDict);
    
    for (const element of microbes) {
        console.log(element);

        db.run(
        `INSERT OR IGNORE INTO incorrectMicrobeList (id, microbe, amount) 
        VALUES (?, ?, 0)`,
        [userId, element],
        (err) => {
            if (err) console.error("error in adding user to incorrect microbe list: ", err);
        });
    }
}

function incrementMicrobeIncorrectCount(userId, microbe) {
    db.run(`UPDATE incorrectMicrobeList SET amount = amount + 1 WHERE id = ? AND microbe = ?`,
        [userId, microbe], (err) => {
        if (err) {
            console.error(err.message);
        }
    });

}

//returns every microbe and the number of times microbe was incorrect for a given user
function getUserStats(userId) {
    //ensures that either a error, the row we are asking for, or the number 0 is returned when the command is called
    //since this is asynchronous
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT microbe, amount FROM incorrectMicrobeList WHERE id = ?`, 
            [userId], 
            (err, rows) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                } else if (rows.length === 0) {
                    resolve({});
                } else {
                    console.log('rows', rows);
                    resolve(rows);
                }
            }
        );
    });
}

module.exports = { db, addUserIncorrectMicrobeList, incrementMicrobeIncorrectCount, getUserStats };
