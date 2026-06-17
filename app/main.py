from app.factory import create_app

app = create_app(enable_redis_listener=True)
