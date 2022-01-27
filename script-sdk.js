var mDefaultServerAddr ="demo.anychat.cn";                 // 默认服务器地址
var mDefaultServerPort = 8906;                                       // 默认服务器端口号
var mSelfUserId = -1;                                                // 本地用户ID
var mTargetUserId = -1;                                    // 目标用户ID（请求了对方的音视频）

// 页面加载完成 初始化
function LogicInit(){    // 初始化  
    varNEED_ANYCHAT_APILEVEL = "0";
    varerrorcode = BRAC_InitSDK(NEED_ANYCHAT_APILEVEL);
    if(errorcode == GV_ERR_SUCCESS)    // 初始化插件成功  
       document.getElementById("login_div").style.display ="block";  // 显示登录界面  
   else    // 没有安装插件，或是插件版本太旧，显示插件下载界面  
       document.getElementById("prompt_div").style.display ="block";    // 显示提示层  
}

// 登录系统
function LoginToHall() {
   BRAC_Connect(mDefaultServerAddr, mDefaultServerPort);  // 连接服务器  
   BRAC_Login(document.getElementById("username").value, "",0);    // 登录系统，密码为空也可登录  
}
//调用登录函数后首先会触发连接服务器函数
// 客户端连接服务器，bSuccess表示是否连接成功，errorcode表示出错代码
functionOnAnyChatConnect(bSuccess, errorcode) {
    if(errorcode == 0) { }    // 连接服务器成功      
     elsealert("连接服务器失败");     //连接失败作提示，此时系统不会触发登录系统函数
}
连接服务器成功后会触发登录系统回调函数
// 客户端登录系统，dwUserId表示自己的用户ID号，errorcode表示登录结果：0 成功，否则为出错代码，参考出错代码定义
functionOnAnyChatLoginSystem(dwUserId, errorcode) {
    if(errorcode == 0) {    // 登录成功，显示大厅界面，隐藏登录界面。失败的话什么也不做，维持原状  
       mSelfUserId = dwUserId;
       document.getElementById("login_div").style.display ="none";   //隐藏登录界面  
       document.getElementById("hall_div").style.display ="block";   //显示大厅界面  
    }
}

// 进入房间
functionEnterRoom(){    // 进入自定义房间
    BRAC_EnterRoom(parseInt(document.getElementById("customroomid").value),"", 0);  //进入房间  
 }
 进入房间触发回调函数
 // 客户端进入房间，dwRoomId表示所进入房间的ID号，errorcode表示是否进入房间：0成功进入，否则为出错代码
 functionOnAnyChatEnterRoom(dwRoomId, errorcode) {
     if(errorcode == 0) {  // 进入房间成功，显示房间界面，隐藏大厅界面；进入房间失败时不作任何动作  
        document.getElementById("hall_div").style.display = "none";//隐藏大厅界面  
        document.getElementById("room_div").style.display ="block";  //显示房间界面  
        BRAC_UserCameraControl(mSelfUserId, 1);  // 打开本地视频  
        BRAC_UserSpeakControl(mSelfUserId, 1);   // 打开本地语音                  
        // 设置本地视频显示位置  
        BRAC_SetVideoPos(mSelfUserId,document.getElementById("AnyChatLocalVideoDiv"),"ANYCHAT_VIDEO_LOCAL");
        // 设置远程视频显示位置（没有关联到用户，只是占位置）                        
        BRAC_SetVideoPos(0, document.getElementById("AnyChatRemoteVideoDiv"),"ANYCHAT_VIDEO_REMOTE");
     }
 }
 
 进入房间时，会触发在线用户回调函数
 // 收到当前房间的在线用户信息，进入房间后触发一次，dwUserCount表示在线用户数（包含自己），dwRoomId表示房间ID
 functionOnAnyChatRoomOnlineUser(dwUserCount, dwRoomId) {
     // 判断是否需要关闭之前已请求的用户音视频数据      
     if(mTargetUserId != -1) {      // mTargetUserId 表示  上次视频会话的用户ID  为自定义变量         
        BRAC_UserCameraControl(mTargetUserId, 0);     // 关闭远程视频     
        BRAC_UserSpeakControl(mTargetUserId, 0);     // 关闭远程语音
        mTargetUserId = -1;
     }
     if(dwUserCount > 1)     // 在该函数中判断是否有在线用户，有的话就打开其中一个远程视频
        SetTheVideo();
 }
 有用户退出房间时判断是否远程用户，并作出相应操作
 // 用户进入（离开）房间，dwUserId表示用户ID号，bEnterRoom表示该用户是进入（1）或离开（0）房间
 functionOnAnyChatUserAtRoom(dwUserId, bEnterRoom) {
     if(bEnterRoom == 1)
        if (mTargetUserId == -1) SetTheVideo();
     else {
        if (mTargetUserId == dwUserId)
            mTargetUserId = -1;
     }
 }
 发送信息时调用函数
 // 发送信息
 function SendMessage() {
    BRAC_SendTextMessage(0, 0,document.getElementById("SendMsg").innerHTML);    //调用发送信息函数   Msg:信息内容
    document.getElementById("ReceiveMsg").innerHTML += "我：" + document.getElementById("SendMsg").innerHTML +"<br />";
    document.getElementById("SendMsg").innerHTML = "";
 }
 收到在线用户发来信息时会触发函数
 // 收到文字消息
 functionOnAnyChatTextMessage(dwFromUserId, dwToUserId, bSecret, lpMsgBuf, dwLen) {
    document.getElementById("ReceiveMsg").innerHTML +=BRAC_GetUserName(dwFromUserId) + "：" + lpMsgBuf +"<br />";  // 收到信息显示到接收框
 }
 自定义函数
 //自定义函数 请求远程视频用户
 function SetTheVideo() {
     varuseridlist = BRAC_GetOnlineUser();    // 获取所有在线用户ID  
    BRAC_UserCameraControl(useridlist[0], 1);   // 请求对方视频  
    BRAC_UserSpeakControl(useridlist[0], 1);   // 请求对方语音  
    BRAC_SetVideoPos(useridlist[0],document.getElementById("AnyChatRemoteVideoDiv"),"ANYCHAT_VIDEO_REMOTE");    // 设置远程视频显示位置
    mTargetUserId = useridlist[0];
 }

 //退出房间调用函数
functionOutOfRoom(){      
   BRAC_LeaveRoom(dwRoomid);
}

//退出系统调用函数
functionOutOfSystem(){      
   BRAC_Logout();
}