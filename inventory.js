jQuery(document).ready(function($) {
    // Comprobamos si el usuario ha iniciado sesión
    var usuario = myScriptParams.usuario;
    if (usuario) {
        // Creamos el elemento de la imagen
        const now = new Date();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        var nowFormatted = `${minutes}`;
        var img = document.createElement('img');
        var imgSrc = 'http://158.179.222.248/wp-content/uploads/inventory/Inventory_Player_' + usuario + '_' + nowFormatted + '.png';
        img.src = imgSrc;
        img.alt = 'Inventario de ' + usuario;
        img.style.display = 'block';
        img.style.margin = '0 auto';

        // Manejamos el error en caso de que la imagen no se pueda cargar
        img.onerror = function() {
            img.src = 'http://158.179.222.248/wp-content/uploads/inventory/empty/generate.png';
        };

        // Añadimos la imagen al body de la página
        document.body.appendChild(img);
    }
});