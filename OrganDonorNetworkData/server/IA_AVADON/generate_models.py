import numpy as np
import joblib
from sklearn.tree import DecisionTreeClassifier

def generate_blood_compatibility_models():
    # Definir tipos de sangre
    blood_types = ['O-', 'O+', 'B-', 'B+', 'A-', 'A+', 'AB-', 'AB+']

    # Crear datos de entrenamiento para recepción
    reception_rules = {
        'O-': ['O-'],
        'O+': ['O-', 'O+'],
        'B-': ['O-', 'B-'],
        'B+': ['O-', 'O+', 'B-', 'B+'],
        'A-': ['O-', 'A-'],
        'A+': ['O-', 'O+', 'A-', 'A+'],
        'AB-': ['O-', 'B-', 'A-', 'AB-'],
        'AB+': ['O-', 'O+', 'B-', 'B+', 'A-', 'A+', 'AB-', 'AB+']
    }

    # Crear datos de entrenamiento para donación
    donation_rules = {
        'O-': ['O-', 'O+', 'B-', 'B+', 'A-', 'A+', 'AB-', 'AB+'],
        'O+': ['O+', 'B+', 'A+', 'AB+'],
        'B-': ['B-', 'B+', 'AB-', 'AB+'],
        'B+': ['B+', 'AB+'],
        'A-': ['A-', 'A+', 'AB-', 'AB+'],
        'A+': ['A+', 'AB+'],
        'AB-': ['AB-', 'AB+'],
        'AB+': ['AB+']
    }

    # Generar datos de entrenamiento
    X = []  # Input features (one-hot encoded blood type)
    y_reception = []  # Output for reception compatibility
    y_donation = []   # Output for donation compatibility

    for blood_type in blood_types:
        # One-hot encoding del tipo de sangre
        features = [1 if bt == blood_type else 0 for bt in blood_types]
        X.append(features)

        # Codificar compatibilidades
        reception_compatibility = [1 if bt in reception_rules[blood_type] else 0 for bt in blood_types]
        donation_compatibility = [1 if bt in donation_rules[blood_type] else 0 for bt in blood_types]

        y_reception.append(reception_compatibility)
        y_donation.append(donation_compatibility)

    X = np.array(X)
    y_reception = np.array(y_reception)
    y_donation = np.array(y_donation)

    # Entrenar modelos
    reception_model = DecisionTreeClassifier()
    donation_model = DecisionTreeClassifier()

    reception_model.fit(X, y_reception)
    donation_model.fit(X, y_donation)

    # Guardar modelos
    joblib.dump(reception_model, 'modelo_recepcion.pkl')
    joblib.dump(donation_model, 'modelo_donacion.pkl')

    print("Modelos generados exitosamente")

if __name__ == "__main__":
    generate_blood_compatibility_models()