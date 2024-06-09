<?php
/*
Template Name: pageLogin
*/
session_start();

get_header();
?>

<main id="primary" class="site-main">

   <?php
   do_action( 'auto_mechanic_breadcrumb' );
   while ( have_posts() ) :
      the_post();

      get_template_part( 'template-parts/content', 'page' );
      
      if ( comments_open() || get_comments_number() ) :
         comments_template();
      endif;

   endwhile; // End of the loop.

   // Si se ha enviado el formulario
   $usuario = $_REQUEST['usuario'];
   $clave = $_REQUEST['clave'];

   if (isset($_SESSION["usuario_valido"])) {
      echo "<script type='text/javascript'>window.location.href = '/~opd/wp/?page_id=7';</script>";
      exit();
   } else if (isset($usuario) && isset($clave)) {
      $servername = "wordpressdb";
      $username = "wp";
      $password = "1313";
      $dbname = "users";
      
      // Create connection
      $conn = new mysqli($servername, $username, $password, $dbname);
      // Check connection
      if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
      } 

      // Consulta para obtener el salt y el hash de la clave del usuario
      $sql = "SELECT clave FROM usuarios WHERE usuario = ?";
      $stmt = $conn->prepare($sql);
      $stmt->bind_param("s", $usuario);
      $stmt->execute();
      $result = $stmt->get_result();
      if ($fila = $result->fetch_assoc()) {
         // Extraemos el salt y el hash de la base de datos
         $partes_clave = explode('$', $fila['clave']);
         $saltDeLaBase = $partes_clave[2];
         $hashDeLaBase = $partes_clave[3];
      
         // Generamos el hash con el salt extraído y la clave proporcionada por el usuario
         // Primero aplicamos SHA-256 a la contraseña, luego concatenamos con el salt y volvemos a aplicar SHA-256
         $hashCalculado = hash('sha256', hash('sha256', $clave) . $saltDeLaBase);
      
         // Comparamos el hash generado con el hash de la base de datos
         if (hash_equals($hashDeLaBase, $hashCalculado)) {
            // La clave ingresada es correcta
            $usuario_valido = $usuario;
            $_SESSION["usuario_valido"] = $usuario_valido;
            echo "<script type='text/javascript'>window.location.href = '/~opd/wp/?page_id=7';</script>";
            exit();
         } else {
            // La clave ingresada no es correcta
            // ... [Código para manejar el error de inicio de sesión] ...
            echo "<div style='border:1px solid red;padding:10px;margin:10px;text-align:center;'>Usuario o contraseña incorrectos</div>";
            mostrarFormularioLogin();
         }
      } else {
         // Usuario no encontrado
         echo "<div style='border:1px solid red;padding:10px;margin:10px;text-align:center;'>Usuario no encontrado</div>";
         mostrarFormularioLogin();
      }
      $stmt->close();
      $conn->close();
   } else {
      mostrarFormularioLogin();
   }

   function mostrarFormularioLogin() {

      print("<BR><BR>\n");
      print("<P CLASS='parrafocentrado' style='text-align:center; color: white;'>Esta zona tiene el acceso restringido.<BR> " .
         " Para entrar use el usuario y contraseña de su cuenta en Lyoko</P>\n");
   
      print("<FORM CLASS='entrada' NAME='login' ACTION='/~opd/wp/?page_id=9' METHOD='POST' style='display: flex; flex-direction: column; align-items: center; color: white;'>\n");
   
      print("<P style='text-align:center; color: white;'><LABEL CLASS='etiqueta-entrada' style='color: white;'>Usuario:</LABEL>\n");
      print("   <INPUT TYPE='TEXT' NAME='usuario' SIZE='15' style='margin-bottom: 10px; color: black;'></P>\n");
      print("<P style='text-align:center; color: white;'><LABEL CLASS='etiqueta-entrada' style='color: white;'>Clave:</LABEL>\n");
      print("   <INPUT TYPE='PASSWORD' NAME='clave' SIZE='15' style='margin-bottom: 10px; color: black;'></P>\n");
      print("<P style='text-align:center; color: white;'><INPUT TYPE='SUBMIT' VALUE='entrar' style='padding: 5px 10px;'></P>\n");
   
      print("</FORM>\n");
   
      print("<P CLASS='parrafocentrado' style='text-align:center; color: white;'>NOTA: si no dispone de identificación registrese desde el " .
         "servidor de Minecraft <BR>Lyoko.hopto.org o póngase en contacto con el " .
         "<A HREF='MAILTO:webmaster@localhost' style='color: white;'>administrador</A> del sitio</P>\n");
   }   
   
?>
</main>
</BODY>
</HTML>



