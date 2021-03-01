package main

import (
	controller "./routines"
	"log"
	"net/http"
)

func main() {

	fs := http.FileServer(http.Dir("static"))

	//подключение статических файлов к корневой директории сайта
	http.Handle("/", fs)
	//тут будем обменивататься данными по вебсокету
	http.HandleFunc("/ws", controller.HandleConnections)
	//here we would canvaStructure json serializing of matrix
	http.HandleFunc("/test", controller.MatrixTestHandler)

	//параллельный процесс
	go controller.HandleMessages()
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
