package Model

//Cтруктура операции
type ChangeData struct {
	Id    int64  `json:"id"`
	Mode  string `json:"mode"`
	X     int64  `json:"x"`
	Y     int64  `json:"y"`
	Model string `json:"model"`
}
