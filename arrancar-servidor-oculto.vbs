' Arranca el servidor de la Fundación Red Con Ciencia al iniciar sesión,
' sin abrir ninguna ventana (estilo 0 = oculto).
' Si el servidor ya está prendido, este segundo intento se cierra solo
' (el puerto 8787 queda ocupado) y no molesta.
'
' Para quitar el auto-arranque:
'   1) Borra este archivo de la carpeta del proyecto.
'   2) Borra "arrancar-servidor-fundacion.vbs" de la carpeta Inicio de
'      Windows (tecla Windows + R, escribe: shell:startup, Enter).
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\hrach\Downloads\fundacion-red-con-ciencia-web-v10"
sh.Run """C:\Program Files\nodejs\node.exe"" server.js", 0, False
