from flask import jsonify

def health():
    """Health check endpoint para Docker"""
    return jsonify({
        'status': 'healthy',
        'service': 'tratios-backend'
    }), 200
