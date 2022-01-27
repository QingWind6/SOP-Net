//实时输出音频数据
function init(rec){
	record = red;
}
if (!navigator.getUserMedia) {
	alert('浏览器不支持音频输入');
}else{
	navigator.getUserMedia(
            { audio: true },
              function (mediaStream) {
                  init(new Recorder(mediaStream));
            },function(error){
				console.log(error)
			}
	)
}
//录音对象
var Recorder = function(stream) {
    var sampleBits = 16;//输出采样数位 8, 16
    var sampleRate = 8000;//输出采样率
    var context = new AudioContext();
    var audioInput = context.createMediaStreamSource(stream);
    var recorder = context.createScriptProcessor(4096, 1, 1);
    var audioData = {
        size: 0          //录音文件长度
        , buffer: []    //录音缓存
        , inputSampleRate: sampleRate    //输入采样率
        , inputSampleBits: 16      //输入采样数位 8, 16
        , outputSampleRate: sampleRate    
        , oututSampleBits: sampleBits      
        , clear: function() {
            this.buffer = [];
            this.size = 0;
        }
        , input: function (data) {
            this.buffer.push(new Float32Array(data));
            this.size += data.length;
        }
        , compress: function () { //合并压缩
            //合并
            var data = new Float32Array(this.size);
            var offset = 0;
            for (var i = 0; i < this.buffer.length; i++) {
                data.set(this.buffer[i], offset);
                offset += this.buffer[i].length;
            }
            //压缩
            var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
            var length = data.length / compression;
            var result = new Float32Array(length);
            var index = 0, j = 0;
            while (index < length) {
                result[index] = data[j];
                j += compression;
                index++;
            }
            return result;
        }, encodePCM: function(){//这里不对采集到的数据进行其他格式处理，如有需要均交给服务器端处理。
			var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
            var sampleBits = Math.min(this.inputSampleBits, this.oututSampleBits);
            var bytes = this.compress();
			var dataLength = bytes.length * (sampleBits / 8);
            var buffer = new ArrayBuffer(dataLength);
			var data = new DataView(buffer);
			var offset = 0;
			for (var i = 0; i < bytes.length; i++, offset += 2) {
            	var s = Math.max(-1, Math.min(1, bytes[i]));
            	data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
			return new Blob([data]);
		}
	};
	this.start = function () {
        audioInput.connect(recorder);
        recorder.connect(context.destination);
    }
 
    this.stop = function () {
        recorder.disconnect();
    }
 
    this.getBlob = function () {
        return audioData.encodePCM();
    }
 
    this.clear = function() {
        audioData.clear();
    }
 
    recorder.onaudioprocess = function (e) {
        audioData.input(e.inputBuffer.getChannelData(0));
    }
  };

// 每隔500毫秒发送数给服务器
begin.onclick = function() {
	var ws = new WebSocket("ws://192.168.168.4:6604");
 
    ws.onopen = function() {
        console.log('握手成功');
        //业务命令构建
		var data = {
		  "cmd": "jtv",//发送命令
		  "id": "018665897939",//发送设备id
		  "type": 1,//对讲类型
		  "channel": 0//语音通道
		}
        ws.send(JSON.stringify(data));
    };
    timeInte=setInterval(function(){
		if(gRecorder&&ws.readyState==1){//ws进入连接状态，则每隔500毫秒发送一包数据
			record.start();
			ws.send(record.getBlob());
 			record.clear();	//每次发送完成则清理掉旧数据		
		}
	},500);
}
// 服务器传输回来的数据转换 
ws.onmessage = function(e) {
    receive(e.data);
};

// 二进制的数据进行解析和播放
function receive(data) {
    if( typeof e == 'string' && JSON.parse(e).message=='OK'){
        console.log('OK');
    }else{
        var buffer = (new Response(data)).arrayBuffer();
        buffer.then(function(buf){
            var audioContext = new ( window.AudioContext || window.webkitAudioContext )();
            var fileResult =addWavHeader(buf, '8000', '16', '1');//解析数据转码wav
            audioContext.decodeAudioData(fileResult, function(buffer) {
               _visualize(audioContext,buffer);//播放
            });
        });
    }
}

//
//处理音频流，转码wav
var addWavHeader = function(samples,sampleRateTmp,sampleBits,channelCount){
    var dataLength = samples.byteLength;
    var buffer = new ArrayBuffer(44 + dataLength);
    var view = new DataView(buffer);
    function writeString(view, offset, string){
        for (var i = 0; i < string.length; i++){
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    var offset = 0;
    /* 资源交换文件标识符 */
    writeString(view, offset, 'RIFF'); offset += 4;
    /* 下个地址开始到文件尾总字节数,即文件大小-8 */
    view.setUint32(offset, /*32*/ 36 + dataLength, true); offset += 4;
    /* WAV文件标志 */
    writeString(view, offset, 'WAVE'); offset += 4;
    /* 波形格式标志 */
    writeString(view, offset, 'fmt '); offset += 4;
    /* 过滤字节,一般为 0x10 = 16 */
    view.setUint32(offset, 16, true); offset += 4;
    /* 格式类别 (PCM形式采样数据) */
    view.setUint16(offset, 1, true); offset += 2;
    /* 通道数 */
    view.setUint16(offset, channelCount, true); offset += 2;
     /* 采样率,每秒样本数,表示每个通道的播放速度 */
    view.setUint32(offset, sampleRateTmp, true); offset += 4;
    /* 波形数据传输率 (每秒平均字节数) 通道数×每秒数据位数×每样本数据位/8 */
    view.setUint32(offset, sampleRateTmp * channelCount * (sampleBits / 8), true); offset +=4;
    /* 快数据调整数 采样一次占用字节数 通道数×每样本的数据位数/8 */
    view.setUint16(offset, channelCount * (sampleBits / 8), true); offset += 2;
    /* 每样本数据位数 */
    view.setUint16(offset, sampleBits, true); offset += 2;
    /* 数据标识符 */
    writeString(view, offset, 'data'); offset += 4;
    /* 采样数据总数,即数据总大小-44 */
    view.setUint32(offset, dataLength, true); offset += 4;
    function floatTo32BitPCM(output, offset, input){
        input = new Int32Array(input);
        for (var i = 0; i < input.length; i++, offset+=4){
            output.setInt32(offset,input[i],true);
        }
    }
   function floatTo16BitPCM(output, offset, input){
        input = new Int16Array(input);
        for (var i = 0; i < input.length; i++, offset+=2){
            output.setInt16(offset,input[i],true);
        }
    }
    function floatTo8BitPCM(output, offset, input){
        input = new Int8Array(input);
        for (var i = 0; i < input.length; i++, offset++){
            output.setInt8(offset,input[i],true);
        }
    }
    if(sampleBits == 16){
        floatTo16BitPCM(view, 44, samples);
    }else if(sampleBits == 8){
        floatTo8BitPCM(view, 44, samples);
    }else{
        floatTo32BitPCM(view, 44, samples);
    }
    return view.buffer;
  }
//播放音频  
var _visualize = function(audioContext, buffer) {
    var audioBufferSouceNode = audioContext.createBufferSource(),
        analyser = audioContext.createAnalyser(),
        that = this;
    //将信号源连接到分析仪
    audioBufferSouceNode.connect(analyser);
    //将分析仪连接到目的地（扬声器），否则我们将听不到声音
    analyser.connect(audioContext.destination);
    //然后将缓冲区分配给缓冲区源节点
    audioBufferSouceNode.buffer = buffer;
    //发挥作用
    if (!audioBufferSouceNode.start) {
        audioBufferSouceNode.start = audioBufferSouceNode.noteOn //在旧浏览器中使用noteOn方法
        audioBufferSouceNode.stop = audioBufferSouceNode.noteOff //在旧浏览器中使用noteOff方法
    };
    //如果有的话，停止前一个声音
    if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
    }
    audioBufferSouceNode.start(0);
    audo.source = audioBufferSouceNode;
    audo.audioContext = audioContext;
}

//
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// app.get('/', function (req, res) {
//     res.sendFile(__dirname + '/index.html');
// });


var usocket = []; //全局变量
io.on('connection', function (socket) {
    console.log('a user connected');

    //监听join事件
    socket.on("join", function (name) {
        usocket[name] = socket
        io.emit("join", name) //服务器通过广播将新用户发送给全体群聊成员
    })

     //监听msg事件
     socket.on("message", function (msg) {
        io.emit("message", msg) //服务器通过广播将新用户发送给全体群聊成员
    })
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
const wsuri = 'ws://localhost:3000';//ws地址
        let ws = new WebSocket(wsuri);