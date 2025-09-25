CREATE DATABASE IF NOT EXISTS univen_accommodation CHARACTER SET utf8mb4;
USE univen_accommodation;

DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS residences;

CREATE TABLE residences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  residence_name VARCHAR(200),
  block VARCHAR(100),
  on_campus BOOLEAN DEFAULT TRUE,
  residence_type ENUM('male','female','offcamp') DEFAULT 'offcamp',
  available_rooms INT DEFAULT 0,
  restrictions VARCHAR(200)
);

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
);

-- sample residences
INSERT INTO residences (residence_name, block, on_campus, residence_type, available_rooms, restrictions) VALUES
-- DBSA Male
('DBSA Male','M-1', TRUE, 'male', 3, 'first year only'),
('DBSA Male','M-2', TRUE, 'male', 3, 'first year only'),
('DBSA Male','M-3', TRUE, 'male', 3, 'first year only'),
('DBSA Male','M-4', TRUE, 'male', 3, ''),
('DBSA Male','M-5', TRUE, 'male', 3, ''),
('DBSA Male','M-6', TRUE, 'male', 3, ''),
('DBSA Male','M-7', TRUE, 'male', 3, ''),
('DBSA Male','M-8', TRUE, 'male', 3, ''),

-- New Male
('New Male','A West', TRUE, 'male', 3, ''),
('New Male','B West', TRUE, 'male', 3, ''),
('New Male','A East', TRUE, 'male', 3, 'nursing only'),
('New Male','B East', TRUE, 'male', 3, ''),

-- F3 (Male)
('F3','', TRUE, 'male', 3, ''),

-- Lost City Boys
('Lost City Boys','Ground Floor', TRUE, 'male', 3, ''),
('Lost City Boys','First Floor', TRUE, 'male', 3, ''),

-- DBSA Female
('DBSA Female','F-1', TRUE, 'female', 3, 'first year only'),
('DBSA Female','F-2', TRUE, 'female', 3, 'first year only'),
('DBSA Female','F-3', TRUE, 'female', 3, 'first year only'),
('DBSA Female','F-4', TRUE, 'female', 3, ''),
('DBSA Female','F-5', TRUE, 'female', 3, ''),
('DBSA Female','F-6', TRUE, 'female', 3, ''),
('DBSA Female','F-7', TRUE, 'female', 3, ''),
('DBSA Female','F-8', TRUE, 'female', 3, ''),

-- New Female
('New Female','A South', TRUE, 'female', 2, ''),
('New Female','B South', TRUE, 'female', 2, ''),
('New Female','A North', TRUE, 'female', 2, ''),
('New Female','B North', TRUE, 'female', 2, 'nursing only'),

-- Lost City Girls
('Lost City Girls','Ground Floor', TRUE, 'female', 3, ''),
('Lost City Girls','First Floor', TRUE, 'female', 3, ''),

-- F5 (Female)
('F5','', TRUE, 'female', 3, ''),

-- Off-campus
('Thohoyandou Off-Campus','', FALSE, 'offcamp', 10, '');

-- sample 11 students with hashed passwords (minimum 4 characters)
INSERT INTO students (student_number, password, first_name, last_name, email, phone, address, gender, id_number, program, year_of_study, gpa, distance) VALUES
('23032739','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Amokelane','Bele','23032739@mvula.univen.ac.za','0711111111','Addr 1','male','9001015002087','Computer Science',1,3.60,12.5),
('24064940','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Dakalo','Makhavhu','24064940@mvula.univen.ac.za','0712222222','Addr 2','male','9001015002088','Engineering',2,3.10,5.2),
('24002372','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Katlego','Mamphekgo','24002372@mvula.univen.ac.za','0713333333','Addr 3','female','9001015002089','Nursing',1,3.85,20.0),
('24039890','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Tsetselelo','Masangu','24039890@mvula.univen.ac.za','0714444444','Addr 4','male','9001015002090','Science',1,2.80,2.1),
('22008058','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Phumlani','Mbatha','22008058@mvula.univen.ac.za','0715555555','Addr 5','male','9001015002091','Nursing',2,3.20,8.3),
('24037121','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Survive','Motupa','24037121@mvula.univen.ac.za','0716666666','Addr 6','male','9001015002092','Education',1,3.00,18.4),
('2325007','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Ntando','Nhlengethwa','ntando444@gmail.com','0717777777','Addr 7','female','9001015002093','Law',3,3.45,11.0),
('24078674','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Siphesihle','Phakathi','24078674@mvula.univen.ac.za','0718888888','Addr 8','female','9001015002094','Engineering',1,2.95,15.6),
('24001435','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Mulungisi','Rikhotso','24001435@mvula.univen.ac.za','0719999999','Addr 9','male','9001015002095','Arts',2,3.40,9.9),
('2025010','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Thabo','Masuku','thabo@gmail.com','0711010101','Addr 10','male','9001015002096','Computer Science',1,3.90,25.0),
('24007589','scrypt:32768:8:1$c65H7Yv0tq3J4C1m$8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b8e2e6e3c6b4e4c6b','Mutangwa','Rambuda','24007589@mvula.univen.ac.za','0711212121','Addr 11','female','9001015002097','Business',1,3.25,6.6);





