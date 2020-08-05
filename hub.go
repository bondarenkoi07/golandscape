package main

import (
	"fmt"
	"log"
	"net/http"

	"./MyDB"
	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/websocket"
)

// подключенные клиенты
var clients = make(map[*websocket.Conn]bool)

// канал передачи данных между горутинами
var broadcast = make(chan MyDB.ChangeData)

// настройка Upgrader
var upgrader = websocket.Upgrader{
	ReadBufferSize:  8192,
	WriteBufferSize: 8192,
}

//создаем объект DB
var dbconn MyDB.DB

func main() {

	fs := http.FileServer(http.Dir("static"))
	err := dbconn.CreateDB("mysql", "db1:Ee010800@tcp(localhost:3306)/db1_landscape")
	if err != nil {
		fmt.Print(err)
	}

	//подключение статических файлов к корневой директории сайта
	http.Handle("/", fs)
	//тут будем обменивататься данными по вебсокету
	http.HandleFunc("/ws", handleConnections)

	//параллельный процесс
	go handleMessages()
	err = http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

//функция принимает и обрабатывает входящий запрос
func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Upgrade initial GET request to a websocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	//получаем массив с операциями, сделанныи до его подключения
	data, err := dbconn.OnConnection()

	fmt.Print("Connected! \n")
	if err != nil {
		log.Fatal(err)
	}
	//отправляем клиенту массив с операциями, сделанныи до его подключения
	err = ws.WriteJSON(data)
	if err != nil {
		log.Fatal(err)
	}

	defer ws.Close()
	//добавляем нового клиента
	clients[ws] = true

	for {
		var msg MyDB.ChangeData
		// считываем данные, полученные поо вебсокету
		err := ws.ReadJSON(&msg)
		fmt.Printf("Data: %v", msg)
		if err != nil {
			log.Printf("error: %v", err)
			delete(clients, ws)
			break
		}
		//получаем коннект текущего пользователя
		msg.Connection = ws.RemoteAddr().String()
		//записываем данные в БД
		err = dbconn.OnRead(msg)
		if err != nil {
			log.Fatal(err)
		}
		//тут будем передавать сообщения другим  горутинам
		broadcast <- msg
	}
}

//
func handleMessages() {
	for {
		// получаем сообщение из канала
		msg := <-broadcast
		// отправляем сообщение каждому клиенту
		output := make(map[int]MyDB.ChangeData)
		output[0] = msg
		for client := range clients {
			if client.RemoteAddr().String() != msg.Connection {
				err := client.WriteJSON(output)
				if err != nil {
					log.Printf("error: %v", err)
					client.Close()
					delete(clients, client)
				}
			}
		}
	}
}
