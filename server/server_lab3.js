//VARS
var http = require('http');
var url = require('url');
let users_list = [];
var last_id = 0;
var md5 = require('md5');
var socketID = 1;
var rooms_list = ["test", "ECV", "Work"];
var logKeepers = [{"room": "test", "keeper":-1},{"room": "ECV", "keeper":-1},{"room": "Work", "keeper":-1}];
var list_usernames = [];

//DATABASE
var redis = require('redis');
var redis_client = redis.createClient(); //new client
redis_client.on('connect', function() {
    console.log('Redis connected');
});

redis_namespace = "rufeDB:users:";
var salt = "!@$%G@#%#G%%^%$((U! %@ _(!@{#$_$*)@:ASD F:AF!#asdfasd d";

redis_client.get("rufeDB:counter", function(err,v) {        
        last_id = v;
});


//HTTP Server
var server = http.createServer( function(request, response) {
        //console.log("REQUEST: " + request.url );
        var url_info = url.parse( request.url, true ); //all the request info is here
        var pathname = url_info.pathname; //the address
        var params = url_info.query; //the parameters
        response.end("OK!"); //send a response
});

server.listen(9043, function() {
        console.log("Server ready!" );
});


//WEBSOCKET
var WebSocketServer = require('websocket').server;
wsServer = new WebSocketServer({ // create the server
    httpServer: server 
});
wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);
    //console.log("NEW WEBSOCKET USER!!!");
    
    var user = {
      socket: connection,
      socketID: socketID,
      room: "hall"  
    };
    
    socketID++;
    //guardar usuario
    users_list.push(user);
    console.log("New Websocket user, socket ID is " + user.socketID);
    
    //send id to the user
     var msg = {
        mySocketID: user.socketID,
        type: "newSocket"
    };
    
    
    connection.send(JSON.stringify(msg));
    
    //connection.sendUTF("welcome!");
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var message_obj = JSON.parse(message.utf8Data);
            var message_type = message_obj.type;
            console.log( "RECEIVED MSG OF TYPE: " +  message_type); //message.utf8Data to print message as it is
            
            
            //PROCESS MESSAGE
             if(message_type == "register"){                    
                  onRegister(message_obj)
             }else if(message_type == "login"){                 
                 onLogin(message_obj);
            }else if(message_type == "message" || message_type == "pointer" || message_type == "remove" ||  message_type == "redPlane" || message_type == "greenPlane"){                 
                 onBroadcast(message_obj);
            }else if(message_type == "room"){
                updateKeeper(message_obj.room, message_obj.socketID);
                users_list[message_obj.socketID -1].room = message_obj.room;
            }else if(message_type == "newroom"){
                var room = {"room":message_obj.room , "keeper":message_obj.socketID}; //como yo he creado la room, yo soy el logkeeper
                logKeepers.push(room);
                
                rooms_list.push(message_obj.room);
                users_list[message_obj.socketID -1].room = message_obj.room;
                
            }else if(message_type == "log"){
                sendMessageToSocketId(message_obj.sendTo, message_obj);
            }else if(message_type == "keeperIn"){
                changeKeeper(message_obj.mySocketID);
            }else if(message_type == "logmessage"){
                message_obj.type = "message";
                sendMessageToSocketId(message_obj.sendTo, message_obj);
            }else if(message_type == "storeDB"){
                var room = getRoom(message_obj.mySocketID);
                redis_client.set("rufeDB:pointers:" + room, JSON.stringify(message_obj.datalist));
            }
        
        }
    });

    connection.on('close', function(connection) {
            // close user connection
            var id = getUserIDBySocket(this);
            console.log("USER " + id +  " IS GONE");
            var isKeeper = checkKeeper(id);
            
            if(isKeeper){
                var msg = {
                    type:"keeperOut",
                    mySocketID: id
                }
                onBroadcast(msg);
            }
    });
});

//gets the socket of the receiver and sends the message to it
function sendMessageToSocketId(socketID, message){
    for(i = 0; i<users_list.length; i++){
        if(socketID == users_list[i].socketID){
            users_list[i].socket.send(JSON.stringify(message));
        }
     }
}


function onRegister(msg_obj){
    //console.log("hashed value = " + md5(msg_obj.password + salt));
    //check if username already exists
    var exists = false;
    for(i = 0; i<list_usernames.length; i++){
        if(msg_obj.username == list_usernames[i]){
            exists = true;
        }
    }
    if(!exists){ //the username is still available
        var user = {
            username: msg_obj.username,
            email: msg_obj.email,
            password: md5(msg_obj.password + salt)        
        }
        //update list_usernames
        list_usernames.push(msg_obj.username);
        console.log(list_usernames);
        console.log(list_usernames.length);
        //store to REDIS
        redis_client.set(redis_namespace + last_id, JSON.stringify(user));
        redis_client.incr("rufeDB:counter");
        redis_client.get("rufeDB:counter", function(err,v) {        
            last_id = v;
        });
    }else{
        //tell the user that the username already exists
        var msg = {
            type: "register_fail",
            rooms: rooms_list
        };
        sendMessageToSocketId(msg_obj.socketID, msg);
    }

}


function onLogin(msg_obj){
    console.log("login request...");
    
    var username = msg_obj.username;
    var password = md5(msg_obj.password + salt);
    var socket_user = msg_obj.socketID;
    
    for(i = 0; i < last_id; i++){
        
         redis_client.get(redis_namespace + i, function(err,user) {        
            var currentUser = JSON.parse(user);
            if(password == currentUser.password && username == currentUser.username){
                console.log("Login success!");
                var msg = {
                       content: "Login succesful:)",
                       type: "login_result",
                       rooms: rooms_list
                 };
                sendMessageToSocketId(socket_user, msg);
            }
        });
 
    }
}


function onBroadcast(msg_obj){
    var room = getRoom(msg_obj.mySocketID);
    console.log("Broadcasting to room: " + room);
    
    for(i = 0; i<users_list.length; i++){
        if(users_list[i].room == room && users_list[i].socketID != msg_obj.mySocketID){
            users_list[i].socket.send(JSON.stringify(msg_obj));
            console.log("message sent!");
        }
     }
}

function getRoom(id){
    var room = "hall";
    for(i = 0; i<users_list.length; i++){
        if(users_list[i].socketID == id){
            room = users_list[i].room;
        }
    }
    return room;
}

//this function will check if we have to update the logkeeper, if there is already a keeper we will ask the logs to him/her
function updateKeeper(room, socketID){
    for(i = 0; i<logKeepers.length; i++){
        if(logKeepers[i].room == room){
            //in this case the socketID becomes the new keeper
            if(logKeepers[i].keeper == -1){
                logKeepers[i].keeper = socketID;
                console.log("New logkeeper for room " + room + ", keeper = " + socketID);
                //check information of database
                var pointers = "";
                redis_client.get("rufeDB:pointers:" + room, function(err,v) {
                    pointers = v;
                    console.log("Sending DB info to user");
                    
                    var msg = {
                        type: "DB",
                        pointers: JSON.parse(pointers)
                    };
                    sendMessageToSocketId(socketID, msg);                    
                });
                                
            }
            else{
                //in this case we are sure there is already a keeper, so we will ask logs to him
                var msg = {
                       type: "sendLogs",
                       to: socketID
                 };
                sendMessageToSocketId(logKeepers[i].keeper, msg);
            }
        }
    }
}

function getUserIDBySocket(socket){
    var resID = -1;
    var index = 0;
    
    while(index < users_list.length){                        
        if(socket == users_list[index].socket){
            resID = users_list[index].socketID;
            break;
        }
        index++;
    }
    return resID;    
}

function checkKeeper(id){
    var res = false;
    for(i = 0; i<logKeepers.length; i++){
        //the given id is Logkeeper, so we have to update it (this function is called when logkeeper is gone)
        if(logKeepers[i].keeper == id){        
            logKeepers[i].keeper = -1;
            res = true;
            console.log("logkeeper gone");
        }        
    }
    return res;
}    

function changeKeeper(id){
    var room = getRoom(id);
    for(i = 0; i<logKeepers.length; i++){
        if(logKeepers[i].room == room){
            //in this case the input id becomes the new keeper
            if(logKeepers[i].keeper == -1){
                logKeepers[i].keeper = id;
                console.log("New logkeeper for room " + room + ", keeper = " + id);
            }
        }
    }
}


