//will store the code for managing the global incorrect question database for all users

//db architecture - primary key userid, field disease, integer amount
//there will be multiple entries of the same userid, but diffrent diseases and amount of times they got the disease incorrect
//on user addition, all diseases will be initialized to 0

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
let sql;

//connect to DB
const db = new sqlite3.Database(path.join(__dirname, 'incorrectDiseaseList.db'), sqlite3.OPEN_READWRITE, (err) => {
    if (err) {return console.error(err.message);}
    else {
        console.log("Connected to the database");
        db.run(
            `CREATE TABLE IF NOT EXISTS incorrectDiseaseList (
            id INTEGER NOT NULL,
            disease TEXT NOT NULL,
            amount INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (id, disease)
            )`
        , (err) => {
            if(err) {
                console.error('error creating table:', err.message);
            } else {
                console.log("incorrectDiseaseList created or existed");
            }
        });
    }
});

//adds a user into the database and initializes all diseases in the database to 0 so that they are ready to increment
function addUserIncorrectDiseaseList(userId) {
    const diseaseDict = JSON.parse(fs.readFileSync('commands/utility/dictionaries/diseasetypes.json', 'utf8'));
    const diseases = Object.keys(diseaseDict);
    
    for (const element of diseases) {
        console.log(element);

        db.run(
        `INSERT OR IGNORE INTO incorrectDiseaseList (id, disease, amount) 
        VALUES (?, ?, 0)`,
        [userId, element],
        (err) => {
            if (err) console.error("error in adding user to incorrect disease list: ", err);
        });
    }
}

function incrementDiseaseIncorrectCount(userId, disease) {
    db.run(`UPDATE incorrectDiseaseList SET amount = amount + 1 WHERE id = ? AND disease = ?`,
        [userId, disease], (err) => {
        if (err) {
            console.error(err.message);
        }
    });

}

//returns every disease and the number of times disease was incorrect for a given user
function getUserStats(userId) {
    //ensures that either a error, the row we are asking for, or the number 0 is returned when the command is called
    //since this is asynchronous
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT disease, amount FROM incorrectDiseaseList WHERE id = ?`, 
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

module.exports = { db, addUserIncorrectDiseaseList, incrementDiseaseIncorrectCount, getUserStats };
