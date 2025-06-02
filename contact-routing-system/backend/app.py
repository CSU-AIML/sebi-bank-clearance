from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import pickle
import os
import logging
from logging.handlers import RotatingFileHandler

# Configure app
app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:3000",  # For local development
    "http://localhost:5173",  # Vite default port
    "https://bankclearancee.onrender.com",  # Replace with your actual frontend URL
    "https://*.onrender.com"  # Allow all Render subdomains
])

# Configure logging
if not os.path.exists('logs'):
    os.mkdir('logs')

app.logger.setLevel(logging.INFO)
app.logger.info('Contact Routing System startup')

# Global variables for model and data
routing_model = None
scaler = None
feature_columns = None
df_clean = None
routing_features = None

# Issue categories and severity levels
issue_categories = ['Account_Access', 'Transaction_Failure', 'Technical_Error', 
                   'Fraud_Alert', 'Customer_Service', 'Data_Sync']

severity_levels = ['Low', 'Medium', 'High', 'Critical']

# Escalation level mapping
escalation_mapping = {
    1: 'Level_1',
    2: 'Level_2',
    3: 'Level_3',
    4: 'Tech_Level_1',
    5: 'Tech_Level_2',
    6: 'Head_GM'
}

# Numerical columns for scaling
numerical_cols = ['Time_Sensitivity', 'Complete_Levels_Count', 'Generic_Email_Count',
                 'Corporate_Email_Count', 'Personal_Email_Count',
                 'Email_Completeness', 'Phone_Completeness']

# Load the model and data
@app.before_request
def load_model_and_data():
    global routing_model, scaler, feature_columns, df_clean, routing_features
    
    # Only load if not already loaded
    if routing_model is None:
        try:
            app.logger.info("Loading model and data...")
            
            # Load the model
            with open('models/routing_model.pkl', 'rb') as file:
                routing_model = pickle.load(file)
            
            # Load the scaler
            with open('models/feature_scaler.pkl', 'rb') as file:
                scaler = pickle.load(file)
            
            # Load feature columns
            with open('models/feature_columns.pkl', 'rb') as file:
                feature_columns = pickle.load(file)
            
            # Load the cleaned data
            df_clean = pd.read_pickle('data/df_clean.pkl')
            routing_features = pd.read_pickle('data/routing_features.pkl')
            
            app.logger.info("Model and data loaded successfully")
        except Exception as e:
            app.logger.error(f"Error loading model and data: {str(e)}")
            # Continue even if loading fails, we'll handle missing model in endpoints

@app.route('/api/test', methods=['GET'])
def test():
    """Simple endpoint to test connectivity"""
    return jsonify({
        'success': True,
        'message': 'Backend API is working!'
    })

@app.route('/api/banks', methods=['GET'])
def get_banks():
    """Get list of banks"""
    try:
        if routing_features is None:
            return jsonify({
                'success': False,
                'error': 'Bank data not loaded. Please check data files.'
            }), 500
            
        banks = routing_features[['Bank_ID', 'Bank_Name']].drop_duplicates().sort_values('Bank_Name')
        return jsonify({
            'success': True,
            'banks': banks.to_dict('records')
        })
    except Exception as e:
        app.logger.error(f"Error retrieving banks: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get list of issue categories"""
    try:
        categories = [{'id': cat, 'name': cat.replace('_', ' ')} for cat in issue_categories]
        return jsonify({
            'success': True,
            'categories': categories
        })
    except Exception as e:
        app.logger.error(f"Error retrieving categories: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/severities', methods=['GET'])
def get_severities():
    """Get list of severity levels"""
    try:
        severities = [{'id': sev, 'name': sev} for sev in severity_levels]
        return jsonify({
            'success': True,
            'severities': severities
        })
    except Exception as e:
        app.logger.error(f"Error retrieving severities: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/route_issue', methods=['POST'])
def route_issue():
    """Route an issue to the appropriate contact based on rule-based logic"""
    try:
        # Log the received request
        data = request.json
        app.logger.info(f"Received routing request: {data}")
        
        # Get form data
        bank_id = int(data.get('bank_id'))
        issue_category = data.get('issue_category')
        severity = data.get('severity')
        
        # Load data if not already loaded
        global df_clean
        if df_clean is None:
            try:
                df_clean = pd.read_pickle('data/df_clean.pkl')
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': f"Could not load bank data: {str(e)}"
                }), 500
        
        # Get the bank data
        bank_data_rows = df_clean[df_clean['Sl No'] == bank_id]
        if len(bank_data_rows) == 0:
            return jsonify({
                'success': False,
                'error': f"No contact data found for bank ID {bank_id}"
            }), 404
        
        bank_data = bank_data_rows.iloc[0]
        
        # Rule-based routing logic (same as in the training model)
        if issue_category in ['Technical_Error', 'Data_Sync']:
            if severity in ['High', 'Critical']:
                level_name = 'Tech_Level_2'
            else:
                level_name = 'Tech_Level_1'
        elif issue_category == 'Fraud_Alert':
            if severity == 'Critical':
                level_name = 'Head_GM'
            else:
                level_name = 'Level_3'
        elif severity == 'Critical':
            level_name = 'Level_3'
        elif severity == 'High':
            level_name = 'Level_2'
        else:  # Low or Medium
            level_name = 'Level_1'
            
        # Determine contact info based on level
        try:
            if level_name == 'Level_1':
                contact_name = bank_data['Official Name (1st Level)']
                contact_phone = bank_data['Mobile Number']
                contact_email = bank_data['Mail Id']
            elif level_name == 'Level_2':
                contact_name = bank_data['Official Name (2nd Level)']
                contact_phone = bank_data['Mobile Number2']
                contact_email = bank_data['Mail Id2']
            elif level_name == 'Level_3':
                contact_name = bank_data['Official Name (3rd Level)']
                contact_phone = bank_data['Mobile Number3']
                contact_email = bank_data['Mail Id3']
            elif level_name == 'Tech_Level_1':
                contact_name = bank_data['Official Name from Technology (1st Level )']
                contact_phone = bank_data['Mobile Number4']
                contact_email = bank_data['Mail Id4']
            elif level_name == 'Tech_Level_2':
                contact_name = bank_data['Official Name from Technology (2nd Level )']
                contact_phone = bank_data['Mobile Number5']
                contact_email = bank_data['Mail Id5']
            elif level_name == 'Head_GM':
                contact_name = bank_data['Official Name (Head or GM)']
                contact_phone = bank_data['Mobile Number6']
                contact_email = bank_data['Mail Id6']
                
            # Handle missing values
            contact_name = str(contact_name) if not pd.isna(contact_name) else "Not Available"
            contact_phone = str(contact_phone) if not pd.isna(contact_phone) else "Not Available"
            contact_email = str(contact_email) if not pd.isna(contact_email) else "Not Available"
            
            # Simulate a confidence level (can be fixed or based on severity)
            if severity == 'Critical':
                confidence = 95.0
            elif severity == 'High':
                confidence = 85.0
            elif severity == 'Medium':
                confidence = 75.0
            else:
                confidence = 65.0
                
            return jsonify({
                'success': True,
                'result': {
                    'bank': str(bank_data['Bank Name']),
                    'level_name': level_name,
                    'contact_name': contact_name,
                    'contact_phone': contact_phone,
                    'contact_email': contact_email,
                    'confidence': confidence
                }
            })
            
        except Exception as e:
            app.logger.error(f"Error retrieving contact details: {str(e)}")
            return jsonify({
                'success': False,
                'error': f"Error retrieving contact details: {str(e)}"
            }), 500
            
    except Exception as e:
        app.logger.error(f"Error in route_issue: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    """Get contacts filtered by position"""
    try:
        position = request.args.get('position', 'all')
        
        # Load data if not already loaded
        global df_clean
        if df_clean is None:
            try:
                df_clean = pd.read_pickle('data/df_clean.pkl')
            except Exception as e:
                return jsonify({
                    'success': False,
                    'error': f"Could not load bank data: {str(e)}"
                }), 500
        
        # Create mapping of positions to column names
        position_mapping = {
            'gm_head': 'Official Name (Head or GM)',
            'level1': 'Official Name (1st Level)',
            'level2': 'Official Name (2nd Level)',
            'level3': 'Official Name (3rd Level)',
            'tech_level1': 'Official Name from Technology (1st Level )',
            'tech_level2': 'Official Name from Technology (2nd Level )'
        }
        
        # Default to all positions if invalid position provided
        if position not in position_mapping and position != 'all':
            position = 'all'
            
        # Prepare response data
        contacts = []
        
        # Filter by position or get all positions
        if position == 'all':
            # Get contacts from all positions
            for pos, column in position_mapping.items():
                contacts.extend(get_contacts_by_column(df_clean, column, pos))
        else:
            # Get contacts for specified position
            column = position_mapping[position]
            contacts.extend(get_contacts_by_column(df_clean, column, position))
            
        return jsonify({
            'success': True,
            'contacts': contacts
        })
        
    except Exception as e:
        app.logger.error(f"Error retrieving contacts: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def get_contacts_by_column(df, name_column, position_type):
    """Helper function to extract contacts by column name"""
    contacts = []
    
    # Map columns to get corresponding email and phone
    email_column_map = {
        'Official Name (1st Level)': 'Mail Id',
        'Official Name (2nd Level)': 'Mail Id2',
        'Official Name (3rd Level)': 'Mail Id3',
        'Official Name from Technology (1st Level )': 'Mail Id4',
        'Official Name from Technology (2nd Level )': 'Mail Id5',
        'Official Name (Head or GM)': 'Mail Id6'
    }
    
    phone_column_map = {
        'Official Name (1st Level)': 'Mobile Number',
        'Official Name (2nd Level)': 'Mobile Number2',
        'Official Name (3rd Level)': 'Mobile Number3',
        'Official Name from Technology (1st Level )': 'Mobile Number4',
        'Official Name from Technology (2nd Level )': 'Mobile Number5',
        'Official Name (Head or GM)': 'Mobile Number6'
    }
    
    email_column = email_column_map.get(name_column)
    phone_column = phone_column_map.get(name_column)
    
    # Get display name for the position type
    position_display = {
        'gm_head': 'GM/Head',
        'level1': 'Level 1 Official',
        'level2': 'Level 2 Official',
        'level3': 'Level 3 Official',
        'tech_level1': 'Technical Level 1',
        'tech_level2': 'Technical Level 2'
    }.get(position_type, position_type)
    
    # Extract contacts
    for _, row in df.iterrows():
        if pd.notna(row[name_column]) and row[name_column] != '':
            contact = {
                'bank_id': int(row['Sl No']),
                'bank_name': row['Bank Name'],
                'name': str(row[name_column]),
                'position': position_display,
                'position_type': position_type,
                'email': str(row[email_column]) if pd.notna(row[email_column]) else '',
                'phone': str(row[phone_column]) if pd.notna(row[phone_column]) else ''
            }
            contacts.append(contact)
            
    return contacts

# Serve the React app
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)