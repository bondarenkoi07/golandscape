//В первую очередь натягиваем программу на разрешение экрана пользователя
var scale;
doScale();
window.onresize = doScale;
function doScale()
{
	var container = document.getElementById("container");
	scale = document.body.clientWidth/container.offsetWidth//Переменная, масштабирования. МЫ еще на нее будет делить положение мыши, потому что иначе оно съезжает
	container.style ='transform:scale('+scale+');';
}
//Находим контейнер для Canvas в документе и узнаем его ширину и высоту.
var canvascontainer = document.getElementById("canvasishere");
var width = canvascontainer.offsetWidth;
var height = canvascontainer.offsetHeight;

//Создаем внутри него Canvas
var canvas = document.createElement("canvas");
canvas.width = width;
canvas.height = height;
canvascontainer.appendChild(canvas);
var ctx = canvas.getContext("2d");


//Объявляем всякую ерунду
var tileSize = 30;//Размер одной плитки в пикселях
var intOfCols = Math.floor(Math.sqrt(width*width+height*height)/tileSize);//Количество столбцов плиток
var intOfRows = Math.floor(height/tileSize)+2;//Количество строк плиток. Из-за искажения они уходят в минус,
var textureName = 'SandTexture.jpg';//переменная с названием текстуры. Изначально - трава
var mouseCoord = {'x':2,'y':0}; //Координата (в ед. отрезках) которая находится под мышью

var landscapeData ={};//Список данных ландшафта. Изначально заполняем нулями
var jsonmes = {'id':0,'mode':'','x':0,'y':0,'model':'','connection':''};


let y;
let x;
for(y = -intOfRows; y < intOfRows; y++)
{
	landscapeData[y]=[];
	for(x = 0; x < intOfCols; x++)
	{
		landscapeData[y][x] = 0;
	}
}	
var objectData = {};//Массив данных объектов. Изначально заполняем пустыми строками
for(y = -intOfRows; y < intOfRows; y++)
{
	objectData[y]=[];
	for(x = 0; x < intOfCols; x++)
	{
		objectData[y][x] = "";
	}
}
let texture, frontSlope, leftFrontSlope, rightFrontSlope, leftSlope, rigthSlope, topTile;
changeTexture(textureName);// Изначальная текстура - трава
let model = "";//Сюда будем запоминать имя отрисовываемой модели

var maxHeight = 3;//Максимальная высота ландшафта
var minHeight = 0;//Минимальная высота ландшафта

//Добавляем отслеживание положения мыши
//открываем вебсокет, с помощью которого будем отправлять json на сервер

canvas.addEventListener("mousemove", function(e){
	//Вычисляем X и Y индекс плитки, над которой мышка
	var mouseX = Math.floor(isometryToDecartX(e.clientX/scale - canvascontainer.getBoundingClientRect().left/scale, e.clientY/scale - canvascontainer.getBoundingClientRect().top/scale)/tileSize);
	var mouseY = Math.floor(isometryToDecartY(e.clientX/scale - canvascontainer.getBoundingClientRect().left/scale, e.clientY/scale - canvascontainer.getBoundingClientRect().top/scale)/tileSize);
	
	mouseCoord.x = mouseX;
	mouseCoord.y = mouseY;
	
	reDraw();
});
// Object contains info about mounts and "objects" placed on map
let Transaction = {landscape: landscapeData,
	object: objectData,
	texture:textureName}

//И отслеживание клика мышью
canvas.addEventListener("mousedown", function (e){
	x = mouseCoord.x;
	y = mouseCoord.y;
	if(terrainUpMaking)//Если выбран иструмент поднятия ландшафта
	{
		doTerrainUp(x, y);
		jsonmes.id=0;
		jsonmes.x=x;
		jsonmes.y=y;
		jsonmes.mode='up';
		jsonmes.model='none';
		jsonmes.connection='';
        console.log(JSON.stringify(jsonmes));
		ws.send(JSON.stringify(jsonmes));
	} else if(terrainDownMaking)//Если выбран инструмент снижения ландшафта
	{
		doTerrainDown(x, y);
		jsonmes.id=0;
		jsonmes.x=x;
		jsonmes.y=y;
		jsonmes.mode='down';
		jsonmes.model='none';
		jsonmes.connection='';
        console.log(JSON.stringify(jsonmes));
		ws.send(JSON.stringify(jsonmes));
	} else if(addingModel&&model!==""&&objectData[y][x]===""&&model!=="none"){ //Добавляем модель только если выбран инструмент добавления модели, выбрана модель и по координате моделей нет
		objectData[y][x]=model;
		jsonmes.id=0;
		jsonmes.x=x;
		jsonmes.y=y;
		jsonmes.mode='PlaceModel';
		jsonmes.model=model;
		jsonmes.connection='';
		fillModelControl(x,y);
        console.log(JSON.stringify(jsonmes));
		ws.send(JSON.stringify(jsonmes));
	}
	Transaction.landscape = landscapeData;
	Transaction.object = objectData;
	Transaction.texture = textureName;
	//sending Map data to be used by new users
	let transactionString = JSON.stringify(Transaction);
	canvaStructure.send(transactionString);
	reDraw();
});

//Флаги на выполнение разных функций отрисовки
var GridEnabled = true;// По умолчанию сетку включаем
var terrainUpMaking = false;
var terrainDownMaking = false;
var addingModel = false;
var changingTexture = false;
var addingLocalTexture = false;

reDraw();

// HEADER: WebSocket connections
//In this part of code represented usage of websocket connections  through
//which will be served transition of data between client and server
// @ws will work for transiting every user's action on canvas


//TERMINOLOGY:
// canvas - structure including info about relief of landscape, placed object and it's coordinates
// and also texture of landscape
// message - structure including info about single action made by user,
//which will be send to all other users through server (see controller.go)

// webSocket ws sends info about changes, which was made up by current user
ws = new WebSocket('ws://localhost:8000/ws');
// webSocket canvaStructure will send info about whole map after current user changes come into force
canvaStructure = new WebSocket('ws://localhost:8000/test');
// error handler will receive info about occurred errors during validation of canvas structure
//errors = new WebSocket('ws://localhost:8000/err')

function canvas_receiver(e){
	const data = JSON.parse(e.data);
	if (data.hasOwnProperty("landscape")
		&&data.hasOwnProperty("object")
		&&data.hasOwnProperty("texture")){
		console.log("Maybe troubles with condition?");
		if (data["texture"] !== ""){
			changeTexture(data["texture"])
		}
		if (data["landscape"] !== null){
			landscapeData = data["landscape"];
		}
		if (data["object"] !== null){
			objectData = data["object"];
			for(let y = -intOfRows; y < intOfRows; y++)
			{
				for(let x = 0; x < intOfCols; x++)
				{
					if(objectData[y][x] !== "" && objectData[y][x] !== "none") {
						model = objectData[y][x]
						fillModelControl(x, y);
					}
				}
			}
			model = ""
		}
	}
}

canvaStructure.onmessage = canvas_receiver;

ws.onmessage = function message_receiver (e) {
    try {
		let mode;
		const data = JSON.parse(e.data);
        if ((!data.hasOwnProperty("landscape")
			|| !data.hasOwnProperty("object")
			|| !data.hasOwnProperty("texture"))) {
			console.log(data);
            for (let i in data) {
                if (data.hasOwnProperty(i)) {
                    mode = data[i]['mode'];
                    let x = data[i]['x'];
                    let y = data[i]['y'];
                    let m = data[i]['model']
                    console.log(m + '\n');
                    if (mode === 'up') {
                        doTerrainUp(x, y);
                    } else if (mode === 'down') {
                        console.log('down');
                        doTerrainDown(x, y);
                    } else if (mode === 'PlaceModel') {
						console.log('enter'+ m);
                        if (model !== 'none') {
                            objectData[y][x] = m;
                            fillModelControl(x, y);
                        }
                    } else if (mode === 'DeleteModel')
                        if (model !== 'none') {
                            ClientDeleteModel(x, y)
                    }
                }
            }
        }else{
			canvas_receiver(e)
        }
		reDraw();
    }catch (e) {
        console.log(e);
    }
}

//Функция перерисовки
function reDraw()
{
	ctx.clearRect(0, 0, width, height);
	//Заполняем Canvas нужной текстурой
	ctx.fillStyle = ctx.createPattern(texture, 'repeat');
	ctx.fillRect(0,0,width,height);
	//рисуем сетку если нужно
	if(GridEnabled)
	{
		ctx.strokeStyle = "rgba(255,165,0,0.5)";
		//Рисуем горизонтальные линии (в проекции)
		for(let i = -intOfRows; i < intOfRows; i++)
		{	
			ctx.beginPath();
			ctx.moveTo(decartToIsometryX(0,i*tileSize),decartToIsometryY(0,i*tileSize));
			ctx.lineTo(decartToIsometryX(width, i*tileSize),decartToIsometryY(width, i*tileSize));
			ctx.closePath();
			ctx.stroke();
		}
		//Рисуем вертикальные линии (в проекции)
		for (let i = 0; i < intOfCols; i++)
		{
			ctx.beginPath();
			ctx.moveTo(decartToIsometryX(i*tileSize,-height),decartToIsometryY(i*tileSize,-height));
			ctx.lineTo(decartToIsometryX(i*tileSize,height),decartToIsometryY(i*tileSize,height));
			ctx.closePath();
			ctx.stroke();
		}
	}
	//Проходимся по массивам с высотами и с объектами, и рисуем поднятые плитки и объекты 
	for(let z = 1; z <= maxHeight; z++)
	{
		for(let y = -intOfRows; y < intOfRows; y++)
		{
			for(let x = 0; x < intOfCols; x++)
			{
				try{//на случай если подминаемая плитка слишком близко к краю и поднятие окружающих приведет к выходу за границу
				if(landscapeData[y][x] === z)
				{
					drawHighland(x,y,landscapeData[y][x]);
				}
				}catch(e){}
				if(objectData[y][x]!=="")//Рисуем объект, если он нашелся.
				{
					drawModel(x,y,objectData[y][x]);
				}
			}
		}
	}
	//Рисуем опорную точку под мышью
	drawPoint(mouseCoord.x,mouseCoord.y);
	if(addingModel&&model!=="")
	{
		drawModel(mouseCoord.x, mouseCoord.y,model);
	}
}
function drawPoint(x,y)
{
	//Рисуем точку
	ctx.fillStyle  = "magenta";//Для опорных точек кислотно розовый, чтоб заметнее
	ctx.strokeStyle = "magenta";
	ctx.beginPath();
	ctx.ellipse(decartToIsometryX((mouseCoord.x+0.5)*tileSize, (mouseCoord.y+0.5)*tileSize),decartToIsometryY((mouseCoord.x+0.5)*tileSize, (mouseCoord.y+0.5)*tileSize),6,3,0,0,Math.PI*2);
	ctx.closePath();
	ctx.fill();
	//Ромбик снизу
	ctx.beginPath();
	ctx.moveTo(decartToIsometryX(mouseCoord.x*tileSize,mouseCoord.y*tileSize),decartToIsometryY(mouseCoord.x*tileSize,mouseCoord.y*tileSize));
	ctx.lineTo(decartToIsometryX((mouseCoord.x+1)*tileSize,mouseCoord.y*tileSize),decartToIsometryY((mouseCoord.x+1)*tileSize,mouseCoord.y*tileSize));
	ctx.lineTo(decartToIsometryX((mouseCoord.x+1)*tileSize,(mouseCoord.y+1)*tileSize),decartToIsometryY((mouseCoord.x+1)*tileSize,(mouseCoord.y+1)*tileSize));
	ctx.lineTo(decartToIsometryX(mouseCoord.x*tileSize,(mouseCoord.y+1)*tileSize),decartToIsometryY(mouseCoord.x*tileSize,(mouseCoord.y+1)*tileSize));
	ctx.lineTo(decartToIsometryX(mouseCoord.x*tileSize,mouseCoord.y*tileSize),decartToIsometryY(mouseCoord.x*tileSize,mouseCoord.y*tileSize));
	ctx.closePath();
	ctx.stroke();
	//И сверху
	ctx.beginPath();
	ctx.moveTo(decartToIsometryX(mouseCoord.x*tileSize,mouseCoord.y*tileSize),decartToIsometryY(mouseCoord.x*tileSize,mouseCoord.y*tileSize)-tileSize*landscapeData[mouseCoord.y][mouseCoord.x]);
	ctx.lineTo(decartToIsometryX((mouseCoord.x+1)*tileSize,mouseCoord.y*tileSize),decartToIsometryY((mouseCoord.x+1)*tileSize,mouseCoord.y*tileSize)-tileSize*landscapeData[mouseCoord.y][mouseCoord.x]);
	ctx.lineTo(decartToIsometryX((mouseCoord.x+1)*tileSize,(mouseCoord.y+1)*tileSize),decartToIsometryY((mouseCoord.x+1)*tileSize,(mouseCoord.y+1)*tileSize)-tileSize*landscapeData[mouseCoord.y][mouseCoord.x]);
	ctx.lineTo(decartToIsometryX(mouseCoord.x*tileSize,(mouseCoord.y+1)*tileSize),decartToIsometryY(mouseCoord.x*tileSize,(mouseCoord.y+1)*tileSize)-tileSize*landscapeData[mouseCoord.y][mouseCoord.x]);
	ctx.lineTo(decartToIsometryX(mouseCoord.x*tileSize,mouseCoord.y*tileSize),decartToIsometryY(mouseCoord.x*tileSize,mouseCoord.y*tileSize)-tileSize*landscapeData[mouseCoord.y][mouseCoord.x]);
	ctx.closePath();
	ctx.stroke();
	//Еще добавим грани
	ctx.moveTo(decartToIsometryX(mouseCoord.x*tileSize,(mouseCoord.y+1)*tileSize),decartToIsometryY(mouseCoord.x*tileSize,(mouseCoord.y+1)*tileSize)-tileSize*landscapeData[mouseCoord.y][mouseCoord.x]);
	ctx.lineTo(decartToIsometryX(mouseCoord.x*tileSize,(mouseCoord.y+1)*tileSize),decartToIsometryY(mouseCoord.x*tileSize,(mouseCoord.y+1)*tileSize));
	ctx.moveTo(decartToIsometryX((mouseCoord.x+1)*tileSize,(mouseCoord.y+1)*tileSize),decartToIsometryY((mouseCoord.x+1)*tileSize,(mouseCoord.y+1)*tileSize)-tileSize*landscapeData[mouseCoord.y][mouseCoord.x]);
	ctx.lineTo(decartToIsometryX((mouseCoord.x+1)*tileSize,(mouseCoord.y+1)*tileSize),decartToIsometryY((mouseCoord.x+1)*tileSize,(mouseCoord.y+1)*tileSize));
	ctx.moveTo(decartToIsometryX((mouseCoord.x+1)*tileSize,mouseCoord.y*tileSize),decartToIsometryY((mouseCoord.x+1)*tileSize,mouseCoord.y*tileSize)-tileSize*landscapeData[mouseCoord.y][mouseCoord.x]);
	ctx.lineTo(decartToIsometryX((mouseCoord.x+1)*tileSize,mouseCoord.y*tileSize),decartToIsometryY((mouseCoord.x+1)*tileSize,mouseCoord.y*tileSize));
	ctx.stroke();
	//Наш кубик для выделения готов!
}
//Функция отрисовки холмиков
function drawHighland(x,y,z)
{
	//Рисуем саму поднятую плитку
	ctx.fillStyle = ctx.createPattern(topTile, 'repeat');
	ctx.strokeStyle = "red";
	ctx.beginPath();
	ctx.moveTo(decartToIsometryX(x*tileSize,y*tileSize),decartToIsometryY(x*tileSize,y*tileSize)-tileSize*z);
	ctx.lineTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
	ctx.lineTo(decartToIsometryX((x+1)*tileSize,(y+1)*tileSize),decartToIsometryY((x+1)*tileSize,(y+1)*tileSize)-tileSize*z);
	ctx.lineTo(decartToIsometryX(x*tileSize,(y+1)*tileSize),decartToIsometryY(x*tileSize,(y+1)*tileSize)-tileSize*z);
	ctx.lineTo(decartToIsometryX(x*tileSize,y*tileSize),decartToIsometryY(x*tileSize,y*tileSize)-tileSize*z);
	ctx.closePath();
	ctx.fill();
	if(GridEnabled)
	{
		ctx.stroke();
	}
	//Далее проверяем окружающие плитки
	//Если по координате X+1,Y+1 относительно поднятой плиткой нет возвышенности, то мы нарисуем треугольный спрайт
	if((landscapeData[y+1][x+1]<z)&&(landscapeData[y][x+1]<z)&&(landscapeData[y+1][x]<z))
	{
		ctx.fillStyle = ctx.createPattern(frontSlope,'repeat');
		ctx.strokeStyle = "yellow";
		ctx.beginPath();
		ctx.moveTo(decartToIsometryX((x+1)*tileSize,(y+1)*tileSize),decartToIsometryY((x+1)*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-(z-2)*tileSize);
		ctx.lineTo(decartToIsometryX(x*tileSize,(y+1)*tileSize),decartToIsometryY(x*tileSize,(y+1)*tileSize)-(z-2)*tileSize);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,(y+1)*tileSize),decartToIsometryY((x+1)*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.closePath();
		ctx.fill();
		if(GridEnabled)
		{
			ctx.stroke();
		}
	}
	//Затем нарисуем левый параллелограм
	if (landscapeData[y+1][x]<z)
	{
		ctx.fillStyle = ctx.createPattern(leftFrontSlope,'repeat');
		ctx.strokeStyle = "indigo";	
		ctx.beginPath();
		ctx.moveTo(decartToIsometryX(x*tileSize,(y+1)*tileSize),decartToIsometryY(x*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,(y+1)*tileSize),decartToIsometryY((x+1)*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX(x*tileSize,(y+1)*tileSize),decartToIsometryY(x*tileSize,(y+1)*tileSize)-(z-2)*tileSize);
		ctx.lineTo(decartToIsometryX(x*tileSize,(y+2)*tileSize),decartToIsometryY(x*tileSize,(y+2)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX(x*tileSize,(y+1)*tileSize),decartToIsometryY(x*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.closePath();
		ctx.fill();
		if(GridEnabled)
		{
			ctx.stroke();
		}			
	}
	//И правый.
	//Если возвышенность есть через клетку, то рисуем немного другой
	if((landscapeData[y][x+1]<z)&&(landscapeData[y-1][x+2]>=z))
	//Если там все таки есть возвышенность, то там мы рисуем срезанный параллелограм
	{
		ctx.fillStyle = ctx.createPattern(rightFrontSlope,'repeat');
		ctx.strokeStyle = "white";	
		ctx.beginPath();
		ctx.moveTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+1.3333333)*tileSize,(y-0.3333333)*tileSize),decartToIsometryY((x+1.3333333)*tileSize,(y-0.3333333)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+2)*tileSize,(y+1)*tileSize),decartToIsometryY((x+2)*tileSize,(y+1)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,(y+1)*tileSize),decartToIsometryY((x+1)*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.closePath();
		ctx.fill();
		if(GridEnabled)
		{
			ctx.stroke();
		}
	}
	//Чтобы они не наезжали друг на друга, надо проверить, есть ли на соседней справа клетке возвышенность	
	else if((landscapeData[y][x+1]<z)&&(landscapeData[y-1][x+1]>=z))
	//Если там все таки есть возвышенность, то там мы рисуем треугольник
	{
		ctx.fillStyle = ctx.createPattern(rightFrontSlope,'repeat');
		ctx.strokeStyle = "black";	
		ctx.beginPath();
		ctx.moveTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+2)*tileSize,(y+1)*tileSize),decartToIsometryY((x+2)*tileSize,(y+1)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,(y+1)*tileSize),decartToIsometryY((x+1)*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.closePath();
		ctx.fill();
		if(GridEnabled)
		{
			ctx.stroke();
		}
	}
	//Если нет, то целый
	else if (landscapeData[y][x+1]<z)
	{
		ctx.fillStyle = ctx.createPattern(rightFrontSlope,'repeat');
		ctx.strokeStyle = "blue";	
		ctx.beginPath();
		ctx.moveTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+2)*tileSize,y*tileSize),decartToIsometryY((x+2)*tileSize,y*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+2)*tileSize,(y+1)*tileSize),decartToIsometryY((x+2)*tileSize,(y+1)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,(y+1)*tileSize),decartToIsometryY((x+1)*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.closePath();
		ctx.fill();
		if(GridEnabled)
		{
			ctx.stroke();
		}			
	}
	//И треугольники по краям. Левый
	//Чтобы не было наложения, сначала проверим, есть ли через клетку еще возвышенность.
	//Если есть, то рисуем обрезанный треугольник
	if((landscapeData[y+1][x-1]<z)&&(landscapeData[y][x-1]<z)&&(landscapeData[y][x-2]>=z))
	{
		ctx.fillStyle = ctx.createPattern(leftSlope,'repeat');
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(decartToIsometryX(x*tileSize,(y+1)*tileSize),decartToIsometryY(x*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX(x*tileSize,(y+2)*tileSize),decartToIsometryY(x*tileSize,(y+2)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x-0.5)*tileSize,(y+1.5)*tileSize),decartToIsometryY((x-0.5)*tileSize,(y+1.5)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x-1)*tileSize,(y+0.5)*tileSize),decartToIsometryY((x-1)*tileSize,(y+0.5)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX(x*tileSize,(y+1)*tileSize),decartToIsometryY(x*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.closePath();
		ctx.fill();
		if(GridEnabled)
		{
			ctx.stroke();
		}
	}
	else if((landscapeData[y+1][x-1]<z)&&(landscapeData[y][x-1]<z))
	{
		ctx.fillStyle = ctx.createPattern(leftSlope,'repeat');
		ctx.strokeStyle = "gray";
		ctx.beginPath();
		ctx.moveTo(decartToIsometryX(x*tileSize,(y+1)*tileSize),decartToIsometryY(x*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX(x*tileSize,(y+2)*tileSize),decartToIsometryY(x*tileSize,(y+2)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x-1)*tileSize,(y+1)*tileSize),decartToIsometryY((x-1)*tileSize,(y+1)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX(x*tileSize,(y+1)*tileSize),decartToIsometryY(x*tileSize,(y+1)*tileSize)-tileSize*z);
		ctx.closePath();
		ctx.fill();
		if(GridEnabled)
		{
			ctx.stroke();
		}
	}
	//И правый
	//Чтобы не было наложения, сначала проверим, есть ли через клетку еще возвышенность. Приходится проверять клетки через одну и рисовать все вручную
	//Если есть, то рисуем обрезанный треугольник
	if((landscapeData[y-1][x+1]<z)&&(landscapeData[y-1][x]<z)&&(landscapeData[y-1][x+2]>=z))
	{
		ctx.fillStyle = ctx.createPattern(rightSlope,'repeat');
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,(y-1)*tileSize),decartToIsometryY((x+1)*tileSize,(y-1)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+1.333333)*tileSize,(y-0.3333333)*tileSize),decartToIsometryY((x+1.3333333)*tileSize,(y-0.3333333)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.closePath();
		ctx.fill();
		if(GridEnabled)
		{
			ctx.stroke();
		}
	}
	//Если есть, то рисуем обрезанный треугольник
	else if((landscapeData[y-1][x+1]<z)&&(landscapeData[y-1][x]<z)&&(landscapeData[y-2][x]>=z))
	{
		ctx.fillStyle = ctx.createPattern(rightSlope,'repeat');
		ctx.strokeStyle = "black";
		ctx.beginPath();
		ctx.moveTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+0.5)*tileSize,(y-1)*tileSize),decartToIsometryY((x+0.5)*tileSize,(y-1)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,(y-1)*tileSize),decartToIsometryY((x+1)*tileSize,(y-1)*tileSize)-(z-1.5)*tileSize);
		ctx.lineTo(decartToIsometryX((x+2)*tileSize,y*tileSize),decartToIsometryY((x+2)*tileSize,y*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.closePath();
		ctx.fill();
		if(GridEnabled)
		{
			ctx.stroke();
		}
	}
	//Если нет, то целый
	else if((landscapeData[y-1][x+1]<z)&&(landscapeData[y-1][x]<z))
	{
		ctx.fillStyle = ctx.createPattern(rightSlope,'repeat');
		ctx.strokeStyle = "aqua";
		ctx.beginPath();
		ctx.moveTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,(y-1)*tileSize),decartToIsometryY((x+1)*tileSize,(y-1)*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+2)*tileSize,y*tileSize),decartToIsometryY((x+2)*tileSize,y*tileSize)-(z-1)*tileSize);
		ctx.lineTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*z);
		ctx.closePath();
		ctx.fill();
		if(GridEnabled)
		{
			ctx.stroke();
		}
	}
}
//Функция добавления модельки
function addModel(mName)
{
	addingModel = true;
	model = mName;
	var models = document.getElementsByClassName("models");
	for(var i = 0;i < models.length; i++)
	{
		models[i].style.border = "";
	}
	document.getElementById(model).style.border = "2px solid #BDBDD2";
}
//Функция удаления модельки
function deleteModel(x,y)
{
    jsonmes.id=0;
    jsonmes.x=x;
    jsonmes.y=y;
    jsonmes.mode='DeleteModel';
    jsonmes.model=objectData[y][x];
    jsonmes.connection='';
    ws.send(JSON.stringify(jsonmes));
    ClientDeleteModel(x,y)
}
//функция удаления модели без отправки на сервер
function ClientDeleteModel(x,y)
{
    var mControl = document.getElementById(objectData[y][x]+""+x+","+y);
    mControl.parentElement.removeChild(mControl);
    objectData[y][x] = "";
    reDraw();
}

//Функция отрисовки модельки
function drawModel(x,y,mName)
{
	const model = document.getElementById(mName);
	//Помимио помещения модельки в точку, наде еще и сдвинуть её, во-первых в середину плитки, а во вторых, на высоту и половину ширины назад,
	//так как у картинки координата 0 находится в верхнем левом углу
	ctx.drawImage(model, decartToIsometryX((x+0.5)*tileSize,(y+0.5)*tileSize)-model.width/2,decartToIsometryY((x+0.5)*tileSize,(y+0.5)*tileSize)-model.height-landscapeData[y][x]*tileSize);
	
}
//Функция подсветки модельки
function showModel(x,y)
{
	reDraw();
	ctx.strokeStyle  = "yellow";
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.moveTo(decartToIsometryX(x*tileSize,y*tileSize),decartToIsometryY(x*tileSize,y*tileSize)-tileSize*landscapeData[y][x]);
	ctx.lineTo(decartToIsometryX((x+1)*tileSize,y*tileSize),decartToIsometryY((x+1)*tileSize,y*tileSize)-tileSize*landscapeData[y][x]);
	ctx.lineTo(decartToIsometryX((x+1)*tileSize,(y+1)*tileSize),decartToIsometryY((x+1)*tileSize,(y+1)*tileSize)-tileSize*landscapeData[y][x]);
	ctx.lineTo(decartToIsometryX(x*tileSize,(y+1)*tileSize),decartToIsometryY(x*tileSize,(y+1)*tileSize)-tileSize*landscapeData[y][x]);
	ctx.lineTo(decartToIsometryX(x*tileSize,y*tileSize),decartToIsometryY(x*tileSize,y*tileSize)-tileSize*landscapeData[y][x]);
	ctx.closePath();
	ctx.stroke();
	ctx.lineWidth = 1;
}
//Функции поднятия/понижения ландшафта. X и Y это координаты изменяемой плитки
function doTerrainUp(x,y)
{
	if(landscapeData[y][x]<maxHeight)
	{
		landscapeData[y][x]++;
		for(var i = y-1; i < y+2;i++)
		{
			for(var j = x-1; j < x+2;j++)
			{
				try
				{
					if((landscapeData[y][x]-landscapeData[i][j])>1)
					{
						doTerrainUp(j,i);
					}
				}
				catch(err)
				{}
			}
		}
				
	}
}
function doTerrainDown(x,y)
{
	if(landscapeData[y][x]>minHeight)
	{
		landscapeData[y][x]--;
		for(var i = y-1; i < y+2;i++)
		{
			for(var j = x-1; j < x+2;j++)
			{
				try
				{
					if((landscapeData[i][j]-landscapeData[y][x])>1)
					{
						doTerrainDown(j,i);
					}
				}
				catch(err)
				{}
			}
		}
	}
}

//Функция включения/выключения сетки
function switchGrid()
{
	GridEnabled = !GridEnabled;
	reDraw();
}

//Функция для смены текстуры на другую
function changeTexture(textureN)
{
	textureName = textureN;
	texture = document.getElementById(textureN);
	//Чтобы покрасить склоны плиток, надо немного перекрасить текстуру. Для этого понадобится еще один Canvas
	var textureCanvas = document.createElement("canvas");
	var texctx = textureCanvas.getContext("2d");
	textureCanvas.width = 100;
	textureCanvas.height = 100;
	texctx.fillStyle  = ctx.createPattern(texture, 'repeat');
	//Заполняем его нашей текстурой и засветляем с помощью заливки прямоугольником
	//Передний треугольничек
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	texctx.fillStyle = "rgba(255,255,255,0.1)";
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	frontSlope = new Image();
	frontSlope.src = textureCanvas.toDataURL();
	texctx.clearRect(0,0,textureCanvas.width,textureCanvas.height);
	//Левый параллелограм
	texctx.fillStyle  = ctx.createPattern(texture, 'repeat');
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	texctx.fillStyle = "rgba(0,0,0,0.3)";
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	leftFrontSlope = new Image();
	leftFrontSlope.src = textureCanvas.toDataURL();
	texctx.clearRect(0,0,textureCanvas.width,textureCanvas.height);
	//Правый параллелограм
	texctx.fillStyle  = ctx.createPattern(texture, 'repeat');
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	texctx.fillStyle = "rgba(255,255,255,0.3)";
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	rightFrontSlope = new Image();
	rightFrontSlope.src = textureCanvas.toDataURL();
	texctx.clearRect(0,0,textureCanvas.width,textureCanvas.height);
	reDraw();
	//Левый треугольничек
	texctx.fillStyle  = ctx.createPattern(texture, 'repeat');
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	texctx.fillStyle = "rgba(0,0,0,0.6)";
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	leftSlope = new Image();
	leftSlope.src = textureCanvas.toDataURL();
	texctx.clearRect(0,0,textureCanvas.width,textureCanvas.height);
	//Правый треугольничек
	texctx.fillStyle  = ctx.createPattern(texture, 'repeat');
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	texctx.fillStyle = "rgba(255,255,255,0.2)";
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	rightSlope = new Image();
	rightSlope.src = textureCanvas.toDataURL();
	texctx.clearRect(0,0,textureCanvas.width,textureCanvas.height);
	//Верхняя плитка
	texctx.fillStyle  = ctx.createPattern(texture, 'repeat');
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	texctx.fillStyle = "rgba(0,0,0,0.2)";
	texctx.fillRect(0,0,textureCanvas.width,textureCanvas.height);
	topTile = new Image();
	topTile.src = textureCanvas.toDataURL();
	texctx.clearRect(0,0,textureCanvas.width,textureCanvas.height);
	//И перерисовываем Canvas
	reDraw();
}
/*
*Преобразование координат
*
*
*/
//Функции для преобразования декартовых координат в изометрические. Нужно для отрисовки представления
function decartToIsometryX(x,y)
{
	return x - y;
}
function decartToIsometryY(x,y)
{
	return (x + y) / 2;
}
//Функции для преобразования изометрических координат в декартовы.
function isometryToDecartX(x,y)
{
	return (x + 2 * y) / 2;
}
function isometryToDecartY(x,y)
{
	return (2 * y - x) / 2;
}
//Функция выбора инструмента
function chooseInstrument(instName)
{
	terrainUpMaking = false;
	terrainDownMaking = false;
	addingModel = false;
	changingTexture = false;
	addingLocalTexture = false;
	var toolbarButtons = document.getElementsByClassName("toolButton");
	for(var i = 0; i < toolbarButtons.length; i++)
	{
		toolbarButtons[i].style.border = "";
	}
	var borderstyle = "2px solid #BDBDD2";
	
	switch(instName)
	{
		case "terrainUp":
			var terrainUpButton = document.getElementById("terrainUpButton");
			terrainUpButton.style.border = borderstyle;
			terrainUpMaking = true;
			break;
		case "terrainDown":
			var terrainDownButton = document.getElementById("terrainDownButton");
			terrainDownButton.style.border = borderstyle;
			terrainDownMaking = true;
			break;
		case "addModel":
			var addModelButton = document.getElementById("addModelButton");
			addModelButton.style.border = borderstyle;
			addingModel = true;
			var textureMenu = document.getElementById("textureMenu");
			var modelMenu = document.getElementById("modelMenu");
			textureMenu.style.display = "none";
			modelMenu.style.display = "block";
			break;
		case "changeTexture":
			var changeMainTextureButton = document.getElementById("changeMainTextureButton");
			changeMainTextureButton.style.border = borderstyle;
			changingTexture = true;
			var textureMenu = document.getElementById("textureMenu");
			var modelMenu = document.getElementById("modelMenu");
			textureMenu.style.display = "block";
			modelMenu.style.display = "none";
			break;
		case "addLocalTexture":
			var addLocalTextureButton = document.getElementById("addLocalTextureButton");
			addLocalTextureButton.style.border = borderstyle;
			addingLocalTexture = true;
			var textureMenu = document.getElementById("textureMenu");
			var modelMenu = document.getElementById("modelMenu");
			textureMenu.style.display = "block";
			modelMenu.style.display = "none";
			break;
	}
}
//Функция добавления панельки объекта в левое меню
function fillModelControl(x,y)
{
	var mControl = document.createElement("div");
	mControl.id = objectData[y][x]+""+x+","+y;
	mControl.setAttribute('class','mControl');
	mControl.setAttribute('onmouseover','showModel('+x+','+y+')');
	mControl.innerHTML = objectData[y][x]+" "+x+" "+y+"<button class = 'toolButton' onclick='deleteModel("+x+","+y+")'>\
	╳</button>";
	var leftPanel = document.getElementById("objectList");
	leftPanel.appendChild(mControl);
}
//Функции сохранения и загрузки
//
//
function exportToJson()
{
    var allTheData = {'texture':textureName,'land':landscapeData,'model':objectData} 
	allTheDataStr = JSON.stringify(allTheData);
    var dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(allTheDataStr);
    
    var exportFileDefaultName = 'landscape.json';
    
    var linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importFromJson()
{
	//Проверяем, поддерживает ли браузер открытие файлов
	if(window.File && window.FileReader && window.FileList && window.Blob) 
	{
		var linkElement;
		linkElement = document.createElement('input');
		linkElement.setAttribute('type','file');
		linkElement.setAttribute('accept','application/json');
		linkElement.setAttribute('onchange','readJsonFile(event)');
		linkElement.click();
	}
	else
	{
		alert("Загрузка файлов не поддерживается!");
	}
}

function readJsonFile(evt)
{
	evt.stopPropagation();
    evt.preventDefault();
	// FileList object.
    var files = evt.target.files;
    var file = files[0];
    var fileReader = new FileReader();
	var stringData;
	fileReader.onloadend = function(progressEvent) {
        stringData = fileReader.result;
		try
		{
			var allTheData = JSON.parse(stringData);
			textureName = allTheData['texture'];
			landscapeData = allTheData['land'];
			objectData = allTheData['model'];
			changeTexture(textureName);
			reDraw();
		}
		catch(e)
		{
			alert("Сбой! "+e);
		}
		//После загрузки очищаем меню моделей
		try
		{
			var oldControlsBox = document.getElementsByClassName('mControl')[0].parentElement;
			oldControlsBox.innerHTML='<h5 align="center">Список используемых моделей</h5>';
		}
		catch(e)
		{}
		//А затем заполняем загруженными элементами
		for(var y = -intOfRows; y < intOfRows; y++)
		{
			for(var x = 0; x < intOfCols; x++)
			{
				if(objectData[y][x]!=="")
				{
					fillModelControl(x,y);
				}
			}
		}
    }
	fileReader.readAsText(file, "UTF-8");
}
//Функция генерации результата. В нашем случае создает картинку и позволяет пользователю её скачать
function generate()
{
	var linkElement = document.createElement('a');
    linkElement.setAttribute('href', canvas.toDataURL());
    linkElement.setAttribute('download', 'MyLandscape.png');
    linkElement.click();	
}

