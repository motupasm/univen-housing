import mysql.connector
from werkzeug.security import generate_password_hash
import os
from dotenv import load_dotenv

load_dotenv()

def init_database():
    try:
        # Connect to MySQL server
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', '')
        )
        
        cursor = connection.cursor()
        
        # Create database if it doesn't exist
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {os.getenv('DB_NAME', 'univen_accommodation')} CHARACTER SET utf8mb4")
        cursor.execute(f"USE {os.getenv('DB_NAME', 'univen_accommodation')}")
        
        # Drop tables if they exist (drop child tables before parents)
        cursor.execute("DROP TABLE IF EXISTS applications")
        cursor.execute("DROP TABLE IF EXISTS students")
        cursor.execute("DROP TABLE IF EXISTS residences")
        
        # Create residences table
        cursor.execute("""
        CREATE TABLE residences (
            id INT AUTO_INCREMENT PRIMARY KEY,
            residence_name VARCHAR(200),
            block VARCHAR(100),
            on_campus BOOLEAN DEFAULT TRUE,
            residence_type ENUM('male','female','offcamp') DEFAULT 'offcamp',
            available_rooms INT DEFAULT 0,
            restrictions VARCHAR(200)
        )
        """)
        
        # Create students table with password field
        cursor.execute("""
        CREATE TABLE students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_number VARCHAR(50),
            password VARCHAR(255),
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            email VARCHAR(200),
            phone VARCHAR(50),
            address TEXT,
            gender ENUM('male','female','other') DEFAULT 'other',
            id_number VARCHAR(50),
            program VARCHAR(255),
            year_of_study TINYINT UNSIGNED,
            gpa DECIMAL(3,2),
            distance DECIMAL(6,2),
            status VARCHAR(30) DEFAULT 'waitlisted',
            assigned_residence VARCHAR(255),
            room_number VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Create applications table
        cursor.execute("""
        CREATE TABLE applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            residence_id INT NOT NULL,
            status ENUM('Pending','Approved','Rejected','Accepted') DEFAULT 'Pending',
            apply_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            room_number VARCHAR(50) NULL,
            CONSTRAINT fk_app_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            CONSTRAINT fk_app_res FOREIGN KEY (residence_id) REFERENCES residences(id) ON DELETE CASCADE,
            CONSTRAINT uq_student_residence UNIQUE (student_id, residence_id)
        )
        """)
        
        # Insert sample residences
        residences = [
            # DBSA Male
            ('DBSA Male','M-1', True, 'male', 3, 'first year only'),
            ('DBSA Male','M-2', True, 'male', 3, 'first year only'),
            ('DBSA Male','M-3', True, 'male', 3, 'first year only'),
            ('DBSA Male','M-4', True, 'male', 3, ''),
            ('DBSA Male','M-5', True, 'male', 3, ''),
            ('DBSA Male','M-6', True, 'male', 3, ''),
            ('DBSA Male','M-7', True, 'male', 3, ''),
            ('DBSA Male','M-8', True, 'male', 3, ''),
            
            # New Male
            ('New Male','A West', True, 'male', 3, ''),
            ('New Male','B West', True, 'male', 3, ''),
            ('New Male','A East', True, 'male', 3, 'nursing only'),
            ('New Male','B East', True, 'male', 3, ''),
            
            # F3 (Male)
            ('F3','', True, 'male', 3, ''),
            
            # Lost City Boys
            ('Lost City Boys','Ground Floor', True, 'male', 3, ''),
            ('Lost City Boys','First Floor', True, 'male', 3, ''),
            
            # DBSA Female
            ('DBSA Female','F-1', True, 'female', 3, 'first year only'),
            ('DBSA Female','F-2', True, 'female', 3, 'first year only'),
            ('DBSA Female','F-3', True, 'female', 3, 'first year only'),
            ('DBSA Female','F-4', True, 'female', 3, ''),
            ('DBSA Female','F-5', True, 'female', 3, ''),
            ('DBSA Female','F-6', True, 'female', 3, ''),
            ('DBSA Female','F-7', True, 'female', 3, ''),
            ('DBSA Female','F-8', True, 'female', 3, ''),
            
            # New Female
            ('New Female','A South', True, 'female', 2, ''),
            ('New Female','B South', True, 'female', 2, ''),
            ('New Female','A North', True, 'female', 2, ''),
            ('New Female','B North', True, 'female', 2, 'nursing only'),
            
            # Lost City Girls
            ('Lost City Girls','Ground Floor', True, 'female', 3, ''),
            ('Lost City Girls','First Floor', True, 'female', 3, ''),
            
            # F5 (Female)
            ('F5','', True, 'female', 3, ''),
            
            # Off-campus
            ('Thohoyandou Off-Campus','', False, 'offcamp', 10, '')
        ]
        
        for residence in residences:
            cursor.execute(
                "INSERT INTO residences (residence_name, block, on_campus, residence_type, available_rooms, restrictions) VALUES (%s, %s, %s, %s, %s, %s)",
                residence
            )
        
        # Insert sample students with hashed passwords
        students = [
            ('23032739', generate_password_hash('pass1'), 'Amokelane', 'Bele', '23032739@mvula.univen.ac.za', '0711111111', 'Addr 1', 'male', '9001015002087', 'Computer Science', 1, 3.60, 12.5),
            ('24064940', generate_password_hash('pass2'), 'Dakalo', 'Makhavhu', '24064940@mvula.univen.ac.za', '0712222222', 'Addr 2', 'male', '9001015002088', 'Engineering', 2, 3.10, 5.2),
            ('24002372', generate_password_hash('pass3'), 'Katlego', 'Mamphekgo', '24002372@mvula.univen.ac.za', '0713333333', 'Addr 3', 'female', '9001015002089', 'Nursing', 1, 3.85, 20.0),
            ('24039890', generate_password_hash('pass4'), 'Tsetselelo', 'Masangu', '24039890@mvula.univen.ac.za', '0714444444', 'Addr 4', 'male', '9001015002090', 'Science', 1, 2.80, 2.1),
            ('22008058', generate_password_hash('pass5'), 'Phumlani', 'Mbatha', '22008058@mvula.univen.ac.za', '0715555555', 'Addr 5', 'male', '9001015002091', 'Nursing', 2, 3.20, 8.3),
            ('24037121', generate_password_hash('pass6'), 'Survive', 'Motupa', '24037121@mvula.univen.ac.za', '0716666666', 'Addr 6', 'male', '9001015002092', 'Education', 1, 3.00, 18.4),
            ('2325007', generate_password_hash('pass7'), 'Ntando', 'Nhlengethwa', 'ntando444@gmail.com', '0717777777', 'Addr 7', 'female', '9001015002093', 'Law', 3, 3.45, 11.0),
            ('24078674', generate_password_hash('pass8'), 'Siphesihle', 'Phakathi', '24078674@mvula.univen.ac.za', '0718888888', 'Addr 8', 'female', '9001015002094', 'Engineering', 1, 2.95, 15.6),
            ('24001435', generate_password_hash('pass9'), 'Mulungisi', 'Rikhotso', '24001435@mvula.univen.ac.za', '0719999999', 'Addr 9', 'male', '9001015002095', 'Arts', 2, 3.40, 9.9),
            ('2025010', generate_password_hash('pass10'), 'Thabo', 'Masuku', 'thabo@gmail.com', '0711010101', 'Addr 10', 'male', '9001015002096', 'Computer Science', 1, 3.90, 25.0),
            ('24007589', generate_password_hash('pass11'), 'Mutangwa', 'Rambuda', '24007589@mvula.univen.ac.za', '0711212121', 'Addr 11', 'female', '9001015002097', 'Business', 1, 3.25, 6.6)
        ]
        
        for student in students:
            cursor.execute(
                "INSERT INTO students (student_number, password, first_name, last_name, email, phone, address, gender, id_number, program, year_of_study, gpa, distance) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                student
            )
        
        connection.commit()
        print("Database initialized successfully!")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    init_database()