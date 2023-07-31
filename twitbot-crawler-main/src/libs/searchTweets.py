import requests
from typing import Dict, Any


def searchTweets(url: str, headers: Dict[str, Any]):
    response = requests.request("GET", url, headers=headers)
    return response
