#!/usr/bin/env python
"""
Minimal prediction wrapper that loads a pickled sklearn model and encoder
from the same folder and accepts a JSON object on stdin with the features.

Expected input (example):
{
  "area": 1500,
  "bedrooms": 3,
  "bathrooms": 2,
  "age": 5,
  "location": "Suburban",
  "condition": "Good",
  "amenities": ["garage","garden"]
}

The script will attempt to transform the input using the loaded encoder
if present, then call model.predict and print a JSON result to stdout.
"""
import os
import sys
import json
import pickle

try:
    # prefer joblib if model saved with joblib
    import joblib
except Exception:
    joblib = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_artifact(name):
    path = os.path.join(BASE_DIR, name)
    if not os.path.exists(path):
        return None
    try:
        if joblib and name.endswith('.pkl'):
            return joblib.load(path)
        with open(path, 'rb') as f:
            return pickle.load(f)
    except Exception:
        # last resort: try pickle
        with open(path, 'rb') as f:
            return pickle.load(f)

def prepare_dataframe(payload):
    # build a simple flat dict. If the encoder expects specific columns,
    # this function may need adjustment to match training code.
    try:
        import pandas as pd
    except Exception:
        pd = None

    row = {}
    row['area'] = float(payload.get('area', 0) or 0)
    row['bedrooms'] = float(payload.get('bedrooms', 0) or 0)
    row['bathrooms'] = float(payload.get('bathrooms', 0) or 0)
    row['age'] = float(payload.get('age', 0) or 0)
    row['location'] = payload.get('location', '')
    row['condition'] = payload.get('condition', '')

    amenities = payload.get('amenities') or []
    # convert amenities list to indicator columns for common amenities
    for a in ['garage', 'garden', 'pool', 'basement', 'balcony']:
        row[f'amenity_{a}'] = 1 if a in amenities else 0

    if pd:
        return pd.DataFrame([row])
    # fallback: return list of values and column names
    return row

def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({'error': 'invalid or empty json input'}))
        sys.exit(2)

    model = load_artifact('model.pkl')
    encoder = load_artifact('encoder.pkl')

    if model is None:
        print(json.dumps({'error': 'model not found'}))
        sys.exit(3)

    df = prepare_dataframe(payload)

    try:
        # If encoder provided, try to use it (it might be a ColumnTransformer or OneHotEncoder)
        if encoder is not None:
            try:
                X = encoder.transform(df)
            except Exception:
                # if encoder expects raw arrays
                X = encoder.transform([list(df.values())])
        else:
            # if df is a pandas DataFrame use its values, else convert dict to 2D array
            try:
                X = df.values
            except Exception:
                X = [list(df.values())]

        # call model.predict
        pred = None
        try:
            pred = model.predict(X)
        except Exception:
            # some sklearn wrappers return a single value for predict
            try:
                pred = model.predict([X])
            except Exception as ex:
                print(json.dumps({'error': 'model prediction failed', 'detail': str(ex)}))
                sys.exit(4)

        # convert prediction to Python native types
        if hasattr(pred, '__iter__'):
            predicted = float(pred[0])
        else:
            predicted = float(pred)

        output = {
            'predicted_price': predicted,
            'currency': 'INR',
            'symbol': '\u20B9'
        }
        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({'error': 'unexpected error', 'detail': str(e)}))
        sys.exit(5)

if __name__ == '__main__':
    main()
