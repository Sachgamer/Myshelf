"""
URL configuration for myshelf_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def home_view(request):
    # Dynamically determine the frontend URL based on the current host IP/domain
    host = request.get_host().split(':')[0]
    frontend_url = f"http://{host}:3000/"
    return HttpResponse(f"""
    <html>
        <head>
            <title>MyShelf Backend</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background-color: #08070d;
                    color: #fff;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }}
                .container {{
                    text-align: center;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 16px;
                    padding: 3rem;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(10px);
                }}
                h1 {{
                    font-size: 2.5rem;
                    margin-bottom: 1rem;
                    background: linear-gradient(135deg, #ffffff 30%, #c084fc 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }}
                p {{
                    color: #a0aec0;
                    margin-bottom: 2rem;
                }}
                .links-group {{
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }}
                .btn {{
                    display: inline-block;
                    padding: 0.8rem 1.8rem;
                    color: white;
                    text-decoration: none;
                    border-radius: 10px;
                    font-weight: bold;
                    transition: background 0.2s;
                }}
                .btn-primary {{
                    background-color: #8b5cf6;
                }}
                .btn-primary:hover {{
                    background-color: #7c3aed;
                }}
                .btn-secondary {{
                    background-color: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }}
                .btn-secondary:hover {{
                    background-color: rgba(255, 255, 255, 0.15);
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1 style="font-size: 3rem; margin: 0 0 0.5rem 0;">🎬 MyShelf</h1>
                <p>Le serveur backend Django fonctionne correctement.</p>
                <div class="links-group">
                    <a href="{frontend_url}" class="btn btn-primary">Accéder au site (Frontend)</a>
                    <a href="/admin/" class="btn btn-secondary">Administration Django</a>
                </div>
            </div>
        </body>
    </html>
    """)

urlpatterns = [
    path('', home_view),
    path('admin/', admin.site.urls),
    path('api/', include('shelf.urls')),
]

