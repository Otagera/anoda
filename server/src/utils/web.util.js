const getHTMLForRender = (serviceName) => {
  const docHTML = `
    <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="description" content="SwaggerUI"/>
                <title>Onboarding service client documentation</title>
                <link "style-src 'self' 'unsafe-inline'" rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
            </head>
            <body>
                <div id="swagger-ui"></div>
                <script "script-src 'self' 'unpkg.com'" src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js" crossorigin ></script>
                <script >
                    window.onload = () => {
                        window.ui = SwaggerUIBundle({
                            url: '/json-docs/${serviceName}',
                            dom_id: '#swagger-ui',
                        });
                    };
            </script>
            </body>
        </html>
    `;
  return docHTML;
};
module.exports = getHTMLForRender;
