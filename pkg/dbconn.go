package pkg

import (
	"../Model"
	"fmt"
	_ "github.com/jackc/pgx"
	"github.com/jackc/pgx/pgxpool"
	"golang.org/x/net/context"
)

//структура БД
type DB struct {
	//пул подклчений
	pool *pgxpool.Pool
	ctx  context.Context
}

//инициализируем нашу БД
func (dbp *DB) NewDB() error {
	(*dbp).ctx = context.Background()
	dsn := "postgres://labs_work:fghfghfgh1337@localhost:5432/labs_work"
	var err error
	(*dbp).pool, err = pgxpool.Connect((*dbp).ctx, dsn)
	if err != nil {
		return err
	}
	return nil
}

//Запись полученной операции в БД
func (dbp *DB) OnRead(msg Model.ChangeData) error {
	SQLStatement := "insert into landscape(x,y,_mode,model,connect) values ($1,$2,$3,$4,$5)"
	//берем коннект из пула
	conn, err := (*dbp).pool.Acquire((*dbp).ctx)
	if err != nil {
		fmt.Print("Connection pool Error:", err)
		return err
	}
	//возвращаем коннект в пул по выполнении функции
	defer conn.Release()
	//начало транзакции
	tx, err := conn.Begin(dbp.ctx)

	if err != nil {
		fmt.Print("SQL Error:", err)
		return err
	}
	//записываем операцию в БД
	_, err = tx.Exec((*dbp).ctx, SQLStatement, msg.X, msg.Y, msg.Mode, msg.Model)

	if err != nil {
		fmt.Print("SQL Error:", err)
		defer tx.Rollback((*dbp).ctx)
		return err
	}
	//подтверждаем транзакциюю
	err = tx.Commit(dbp.ctx)
	if err != nil {
		fmt.Print("SQL Error:", err)
		return err
	}
	return nil
}

// при подключении отправим массив операций новому клиенту
func (dbp *DB) OnConnection() (interface{}, error) {
	SQLStatement := "select * from landscape order by id"
	conn, err := (*dbp).pool.Acquire((*dbp).ctx)
	defer conn.Release()
	if err != nil {
		fmt.Print("SQL Error:", err)
		return []byte(""), err
	}
	tx, err := conn.Begin((*dbp).ctx)
	if err != nil {
		fmt.Print("SQL Error:", err)
		return []byte(""), err
	}
	rows, err := tx.Query((*dbp).ctx, SQLStatement)
	var arr Model.ChangeData
	output := make(map[int]interface{})
	var i = 0
	for rows.Next() {
		err = rows.Scan(&arr.Id, &arr.X, &arr.Y, &arr.Model, &arr.Mode)
		if err != nil {
			fmt.Print("SQL Error:", err)
			return []byte(""), err
		}
		output[i] = arr
		i++
	}
	err = tx.Commit((*dbp).ctx)
	if err != nil {
		fmt.Print("SQL Error:", err)
		return []byte(""), err
	}
	return output, nil
}
