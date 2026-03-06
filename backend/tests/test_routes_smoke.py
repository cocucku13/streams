from app.main import app


def test_stream_live_route_registered() -> None:
    route_paths = {route.path for route in app.routes}

    assert "/api/streams/live" in route_paths
