package MyDB

import (
	"database/sql"
	"fmt"
)

type DB struct {
	db *sql.DB
}

type ChangeData struct {
	Id         int64  `json:"id"`
	Mode       string `json:"mode"`
	X          int64  `json:"x"`
	Y          int64  `json:"y"`
	Model      string `json:"model"`
	Connection string `json:"connection"`
}

func (dbp *DB) CreateDB(driver string, dsn string) error {
	var err error
	(*dbp).db, err = sql.Open(driver, dsn)
	if err != nil {
		return err
	}
	_, err = (*dbp).db.Exec("create  table if not exists landscape(" +
		"id serial not null," +
		" x int not null," +
		" y int not null," +
		" model varchar(20)," +
		" _mode varchar(20) not null," +
		" connect varchar(30) not null)")
	if err != nil {
		return err
	}
	return nil
}

//Запись полученной операции в БД
func (dbp *DB) OnRead(msg ChangeData) error {
	SQLStatement := "insert into landscape(x,y,_mode,model,connect) values (?,?,?,?,?)"

	tx, err := dbp.db.Begin()

	if err != nil {
		fmt.Print("SQL Error:", err)
		return err
	}
	//записываем операцию в БД
	_, err = tx.Exec(SQLStatement, msg.X, msg.Y, msg.Mode, msg.Model, msg.Connection)

	if err != nil {
		fmt.Print("SQL Error:", err)
		defer tx.Rollback()
		return err
	}
	//подтверждаем транзакциюю
	err = tx.Commit()
	if err != nil {
		fmt.Print("SQL Error:", err)
		return err
	}
	return nil
}

// при подключении отправим массив операций новому клиенту
func (dbp DB) OnConnection() (interface{}, error) {
	SQLStatement := "select * from landscape order by id"

	tx, err := dbp.db.Begin()

	if err != nil {
		fmt.Print("SQL Error:", err)
		return []byte(""), err
	}

	rows, err := tx.Query(SQLStatement)
	var arr ChangeData
	output := make(map[int]interface{})
	var i = 0
	for rows.Next() {
		err = rows.Scan(&arr.Id, &arr.X, &arr.Y, &arr.Model, &arr.Mode, &arr.Connection)
		if err != nil {
			fmt.Print("SQL Error:", err)
			return []byte(""), err
		}
		output[i] = arr
		i++
	}
	err = tx.Commit()
	if err != nil {
		fmt.Print("SQL Error:", err)
		return []byte(""), err
	}
	return output, nil
}
