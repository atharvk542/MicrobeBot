const path = require('path');
const sqlite3 = require('sqlite3').verbose();
let sql;

//connect to DB
const db = new sqlite3.Database(path.join(__dirname, 'questionsAnswered.db'), sqlite3.OPEN_READWRITE, (err) => {
    if (err) {return console.error(err.message);}
    else {
        console.log('connected to the database');
        db.run(
            `CREATE TABLE IF NOT EXISTS questionsAnswered (
            id INTEGER PRIMARY KEY NOT NULL,
            numMicrobeType INTEGER NOT NULL DEFAULT 0,
            numDiseaseName INTEGER NOT NULL DEFAULT 0,
            numDiseaseType INTEGER NOT NULL DEFAULT 0
            )`
        , (err) => {
            if(err) {
                console.error(err.message);
            } else {
                console.log('table created or existed');
            }
        });
    }
});

//adds a user into the database, and does nothing if they are already there
function addUser(userId) {
    db.run(
        `INSERT OR IGNORE INTO questionsAnswered (id, numMicrobeType, numDiseaseName, numDiseaseType) 
         VALUES (?, 0, 0, 0)`, 
        [userId], 
        (err) => {
            if (err) console.error(err.message);
        }
    );
}

//updates the number of questions in whatever column specified
function incrementQuestionCount(userId, column) {
    const sql = `UPDATE questionsAnswered SET ${column} = ${column} + 1 WHERE id = ?`;
    db.run(sql, [userId], function (err) {
        if (err) {
            console.error(err.message);
        }
    });

}

//gets the number of questions answered in whatever column specified
function getUserStats(userId, column) {
    //ensures that either a error, the row we are asking for, or the number 0 is returned when the command is called
    //since this is asynchronous
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT ${column} FROM questionsAnswered WHERE id = ?`, 
            [userId], 
            (err, row) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                } else if (row) {
                    resolve(row[column]);
                } else {
                    resolve(0);
                }
            }
        );
    });
}

module.exports = { db, addUser, incrementQuestionCount, getUserStats };
