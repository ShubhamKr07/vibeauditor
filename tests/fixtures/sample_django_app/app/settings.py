SECRET_KEY = "dev-only"
DEBUG = False
INSTALLED_APPS = ["django.contrib.auth", "django.contrib.contenttypes"]
DATABASES = {"default": {"ENGINE": "django.db.backends.postgresql", "NAME": "app"}}
