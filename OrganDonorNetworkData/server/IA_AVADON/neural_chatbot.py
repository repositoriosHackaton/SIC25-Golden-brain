import json
import random
import string
import nltk
import os
import unicodedata
import re
import joblib
import numpy as np
import argparse
import sys
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import CountVectorizer

def parse_args():
    parser = argparse.ArgumentParser(description='Chatbot de AVADON')
    parser.add_argument('--message', required=True, help='Mensaje del usuario')
    parser.add_argument('--intentions', required=True, help='Ruta al archivo de intenciones')
    return parser.parse_args()

class NeuralChatbot:
    def __init__(self, intentions_path):
        # Configurar rutas
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.nltk_data_path = os.path.join(self.base_dir, 'nltk_data')

        # Inicializar NLTK
        if not os.path.exists(self.nltk_data_path):
            os.makedirs(self.nltk_data_path)
        nltk.data.path.append(self.nltk_data_path)

        # Inicializar componentes NLP
        self.stemmer = PorterStemmer()
        self.vectorizer = CountVectorizer()

        # Cargar recursos NLTK
        nltk.download('punkt', download_dir=self.nltk_data_path, quiet=True)
        nltk.download('stopwords', download_dir=self.nltk_data_path, quiet=True)
        self.stop_words = set(stopwords.words('english'))

        # Cargar base de conocimientos
        with open(intentions_path, 'r', encoding='utf-8') as file:
            self.intents = json.load(file)
            all_patterns = []
            for intent in self.intents['intents']:
                processed_patterns = [self.word_normalization(pattern) for pattern in intent['patterns']]
                all_patterns.extend(processed_patterns)
            self.vectorizer.fit(all_patterns)

        # Cargar modelos de clasificación
        modelo_path = os.path.join(self.base_dir, 'attached_assets')
        self.clasificar_recepcion = joblib.load(os.path.join(modelo_path, 'modelo_recepcion.pkl'))
        self.clasificar_donacion = joblib.load(os.path.join(modelo_path, 'modelo_donacion.pkl'))

    def word_normalization(self, words):
        texto_normalizado = unicodedata.normalize('NFD', words)
        texto_sin_acentos = re.sub(r'[\u0300-\u036f]', '', texto_normalizado)
        texto_limpio = re.sub(r'[^a-zA-Z0-9\s]', '', texto_sin_acentos)
        return texto_limpio.lower()

    def hotencode_sangre(self, sangre):
        sangres = ['O-', 'O+', 'B-', 'B+', 'A-', 'A+', 'AB-', 'AB+']
        return [1 if s == sangre else 0 for s in sangres]

    def decodificar_sangre(self, hotencoded):
        sangres = ['O-', 'O+', 'B-', 'B+', 'A-', 'A+', 'AB-', 'AB+']
        return [sangres[i] for i in range(8) if hotencoded[i] == 1]

    def recepcion(self, type_blood):
        hotencoded = self.hotencode_sangre(type_blood.upper())
        prediccion = self.clasificar_recepcion.predict([hotencoded])[0]
        return self.decodificar_sangre(prediccion)

    def donacion(self, type_blood):
        hotencoded = self.hotencode_sangre(type_blood.upper())
        prediccion = self.clasificar_donacion.predict([hotencoded])[0]
        return self.decodificar_sangre(prediccion)

    def extract_blood_type(self, text):
        tipos_sangre_posibles = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]
        palabras = text.split()
        coincidencias = []

        for palabra in palabras:
            palabra_limpia = palabra.strip(",.?!")
            if palabra_limpia.upper() in tipos_sangre_posibles:
                coincidencias.append(palabra_limpia.upper())

        return coincidencias[0] if coincidencias else None

    def get_response(self, user_input):
        try:
            best_score = 0
            best_intent = None
            entity = self.extract_blood_type(user_input)

            # Encontrar el intent más similar
            for intent in self.intents['intents']:
                for pattern in intent['patterns']:
                    similarity = self.calculate_similarity(user_input, pattern)
                    if similarity > best_score:
                        best_score = similarity
                        best_intent = intent

            if best_score > 0.3:
                response = random.choice(best_intent['responses'])

                if entity and "{entity}" in response:
                    modelo_recepcion = self.recepcion(entity)
                    modelo_donacion = self.donacion(entity)

                    response = response.format(
                        entity=entity,
                        modelo_recepcion=", ".join(modelo_recepcion),
                        modelo_donacion=", ".join(modelo_donacion)
                    )

                return response
            elif best_score > 0.1:
                return "Entiendo que tu pregunta está relacionada con temas médicos, pero ¿podrías reformularla? Como asistente especializado en sangre, quiero asegurarme de darte la información más precisa."
            else:
                return "Lo siento, como asistente médico especializado en temas de sangre, no puedo responder esa pregunta. ¿Te gustaría saber algo específico sobre tipos de sangre, donaciones o transfusiones?"

        except Exception as e:
            return "Ha ocurrido un error en mi sistema. Por favor, intenta reformular tu pregunta sobre temas relacionados con la sangre y transfusiones."

    def calculate_similarity(self, text1, text2):
        try:
            text1 = self.preprocess_text(text1)
            text2 = self.preprocess_text(text2)
            vectors = self.vectorizer.transform([text1, text2]).toarray()
            dot_product = np.dot(vectors[0], vectors[1])
            norm1 = np.linalg.norm(vectors[0])
            norm2 = np.linalg.norm(vectors[1])

            if norm1 == 0 or norm2 == 0:
                return 0

            return dot_product / (norm1 * norm2)
        except Exception:
            return 0

    def preprocess_text(self, text):
        text = self.word_normalization(text.lower())
        tokens = word_tokenize(text)
        tokens = [self.stemmer.stem(token) for token in tokens]
        return ' '.join(tokens)

def main():
    args = parse_args()
    try:
        chatbot = NeuralChatbot(args.intentions)
        response = chatbot.get_response(args.message)
        # Solo imprimir la respuesta final, sin logs
        print(response, flush=True)
    except Exception as e:
        print("Lo siento, ha ocurrido un error en el sistema. Por favor, intenta de nuevo.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()