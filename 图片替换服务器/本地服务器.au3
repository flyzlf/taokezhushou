#Region ;**** 参数创建于 ACNWrapper_GUI ****
#AutoIt3Wrapper_icon=C:\Windows\syswow64\SHELL32.dll|-18
#AutoIt3Wrapper_UseX64=n
#EndRegion ;**** 参数创建于 ACNWrapper_GUI ****
#cs
	Run this script
	Point your browser to http://localhost:8081/
#ce
#include "TCPServer.au3"

_TCPServer_OnReceive("received")

_TCPServer_DebugMode(False)
_TCPServer_SetMaxClients(10)

TraySetToolTip ("负责给QQ发消息63630")
_TCPServer_Start(63630)
If @error Then
	TraySetToolTip ("负责图片63631")
	_TCPServer_Start(63631)
	If @error Then Exit;
Else
	Run(@ScriptDir&"\本地服务器.exe",@ScriptDir)
	FileDelete(@ScriptDir&"\tmp.ini");//删除图片字典文件
EndIf
;//HotKeySet("{esc}","changeVal");
Global $pause=False;
Func changeVal()
	TrayTip("收到","现在就停止",10);
	$pause=True;
EndFunc
Global $winTitle=IniRead(@ScriptDir&"\config.ini","窗口","标题","");
Global $sendSleep=Number(IniRead(@ScriptDir&"\config.ini","窗口","发送前延时",0.5))
If $winTitle="" Then
	MsgBox(0,"请配置窗口标题","请配置窗口标题")
	Exit;
EndIf
Func received($iSocket, $sIP, $sData, $sParam)
	$sData=StringReplace($sData,"&amp;","&");
	;//__TCPServer_Log($sData)
	;//ConsoleWrite(@CRLF&getRequest($sData,"action"))
	If $pause=False Then
		Local $_action=getRequest($sData,"action");
		
		;//IniWrite(@ScriptDir&"\config.ini","test","all",$sData)
		;//IniWrite(@ScriptDir&"\config.ini","test","action",$_action)
		Local $_ret="";
		Select
			Case $_action="localimg"
				Local $imgUrl=getRequest($sData,"imgurl");
				$imgUrl=StringLower($imgUrl);
				$imgUrl=StringRegExpReplace($imgUrl,"fucktx"," ");
				$imgUrl=StringRegExpReplace($imgUrl,"file:///","");
				__TCPServer_Log($imgUrl);
				Local $Content_Type="";
				Local $sFileType = StringRight($imgUrl,4)
				Switch $sFileType
					Case "html"
						$Content_Type="text/html"
					Case ".htm"
						$Content_Type="text/html"
					Case ".jpg"
						$Content_Type="image/jpeg"
					Case "jpeg"
						$Content_Type="image/jpeg"
					Case ".png"
						$Content_Type="image/png"
					Case Else
						
				EndSwitch
				_TCPServer_Send($iSocket, Binary("HTTP/1.1 200 OK" & @CRLF & _
						"Connection:keep-alive"& @CRLF & _
						"Age:1"& @CRLF & _
						"Content-Type:"& $Content_Type& @CRLF & @CRLF ));
				If $Content_Type="" Then
					_TCPServer_Close($iSocket);	
					Return;					
				EndIf
				Local $file=FileOpen($imgUrl,16);
				Local $cannotopen=True;
				If @error=0 Then
					$cannotopen=False;
					$_ret=FileRead($file);
					FileClose($file);
				EndIf
				Local $a;
				If $cannotopen=False Then
					While BinaryLen($_ret) 
						$a = _TCPServer_Send($iSocket,$_ret)
						$_ret = BinaryMid($_ret,$a+1,BinaryLen($_ret)-$a)
					WEnd
				EndIf
				;//Local $Packet = Binary(@CRLF & @CRLF)
				;//_TCPServer_Send($iSocket,$Packet)
				_TCPServer_Close($iSocket);	
				Return;
			Case $_action="getimg"
				Local $imgUrl=getRequest($sData,"imgurl")
				__TCPServer_Log($imgUrl)
				$imgUrl=StringReplace($imgUrl,"http:","")
				$imgUrl=StringReplace($imgUrl,"https:","")
				$imgUrl=StringReplace($imgUrl,"//","")
				Local $imgUrl_low=StringLower($imgUrl)
				Local $retUrl=IniRead(@ScriptDir&"\tmp.ini","图片字典",$imgUrl_low,"")
				If $retUrl="" Then
					IniWrite(@ScriptDir&"\tmp.ini","图片字典",$imgUrl_low,$imgUrl)
					$retUrl=$imgUrl
				EndIf
				$retUrl="http://"&$retUrl;
				_TCPServer_Send($iSocket, "HTTP/1.1 302 Object moved" & @CRLF & _
						"Location:" &$retUrl& @CRLF & _
						"Content-Type: text/html" & @CRLF & @CRLF & _
						$_ret)
				_TCPServer_Close($iSocket);
				Return;
			Case $_action="clearClipbrd"
				ClipPut("");
				$_ret="ok"
			Case $_action="sendToQQ"
				If ClipGet()="" Then ;//如果剪切板为空
					$_ret="reCopy"
				Else
					BlockInput(1);
					WinActivate($winTitle,"")
					If WinWaitActive($winTitle,"",5)=0 Then
						$_ret="stop";
						TrayTip("错误","找不到群窗口",10);
					Else
						Local $beforPasteDelay=getRequest($sData,"beforpastedelay")
						If $beforPasteDelay="" Then $beforPasteDelay=50
						$beforPasteDelay=Number($beforPasteDelay);
						Local $afterPasteDelay=getRequest($sData,"afterpastedelay")
						If $afterPasteDelay="" Then $afterPasteDelay=500
						$afterPasteDelay=Number($afterPasteDelay);
						Sleep($beforPasteDelay)
						Send("^v");
						Sleep($afterPasteDelay);
						Send("^{enter}")
						$_ret="ok"
						WinSetState ( $winTitle,"", @SW_MINIMIZE )
					EndIf
					BlockInput(0);
				EndIf
		EndSelect
	Else
		$pause=False
		$_ret="pause"
	EndIf
	;//MsgBox(0,"text","请求:"&$_action&",回应:"&$_ret)
	_TCPServer_Send($iSocket, "HTTP/1.1 200 OK" & @CRLF & _
			"Access-Control-Allow-Origin: *" & @CRLF & _
			"Content-Type: text/html" & @CRLF & @CRLF & _
			$_ret)
	_TCPServer_Close($iSocket)

EndFunc   ;==>received

While 1
	Sleep(100)
WEnd

Func getRequest($_data, $_key)
	Local $arr = StringRegExp($_data, "(\?|&)" & $_key & "=([^&]*)(&|HTTP)", 1)
	If @error Then Return "";
	Return StringReplace($arr[1]," ","");
EndFunc   ;==>getRequest

Func _encodeURIComponent($sStr)
        Local $oSC
        $oSC = ObjCreate('MSScriptControl.ScriptControl.1')
        $oSC.Language = 'JavaScript'
        $sResult = $oSC.Eval('encodeURIComponent(''' & $sStr & ''')')
        Return $sResult
EndFunc   ;==>_encodeURIComponent

Func _decodeURIComponent($sStr)
        Local $oSC
        $oSC = ObjCreate('MSScriptControl.ScriptControl.1')
        $oSC.Language = 'JavaScript'
        $sResult = $oSC.Eval('decodeURIComponent(''' & $sStr & ''')')
        Return $sResult
EndFunc   ;==>_decodeURIComponent