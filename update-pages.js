const fs = require('fs');
const path = require('path');

const htmlFiles = [
    'index.html',
    'catalogo.html',
    'trabajores.html',
    'añadir.html',
    'editar.html',
    'nosotros.html',
    'contacto.html'
];

const menuTemplate = `
                <a class="text-light" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-person"></i>
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <!-- El menú se actualizará dinámicamente -->
                </ul>
                <i class="bi bi-basket3"></i>
`;

const scriptsTemplate = `
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="script.js"></script>
    <script src="js/auth.js"></script>
</body>
`;

htmlFiles.forEach(file => {
    const filePath = path.join(__dirname, 'public', file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Actualizar el menú
        content = content.replace(
            /<a[^>]*id="userDropdown"[\s\S]*?<\/ul>\s*<i class="bi bi-basket3"><\/i>/,
            menuTemplate
        );
        
        // Actualizar los scripts
        content = content.replace(
            /<script[\s\S]*?<\/body>/,
            scriptsTemplate
        );
        
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
});