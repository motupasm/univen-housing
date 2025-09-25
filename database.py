import mysql.connector
from mysql.connector import Error, pooling
from werkzeug.security import generate_password_hash
import os
from dotenv import load_dotenv
from datetime import datetime
import threading
import time

load_dotenv()

class Database:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(Database, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, 'initialized'):
            return
            
        self.host = os.getenv('DB_HOST', 'localhost')
        self.user = os.getenv('DB_USER', 'root')
        self.password = os.getenv('DB_PASSWORD', '')
        self.database = os.getenv('DB_NAME', 'univen_accommodation')
        self.pool = None
        self.initialized = True
        self._create_pool()

    def _create_pool(self):
        """Create a connection pool for better performance and reliability"""
        try:
            self.pool = mysql.connector.pooling.MySQLConnectionPool(
                pool_name="mypool",
                pool_size=32,  # Maximum allowed pool size
                pool_reset_session=True,
                host=self.host,
                user=self.user,
                password=self.password,
                database=self.database,
                autocommit=True,
                ssl_disabled=True,  # Disable SSL to avoid SSL errors
                connection_timeout=10,
                charset='utf8mb4',
                use_unicode=True
            )
            print("✅ Database connection pool created successfully!")
        except Error as err:
            print(f"❌ Database pool creation error: {err}")
            self.pool = None

    def get_connection(self):
        """Get a connection from the pool"""
        try:
            if self.pool is None:
                self._create_pool()
            return self.pool.get_connection()
        except Error as err:
            print(f"❌ Error getting connection from pool: {err}")
            return None

    def execute_query(self, query, params=None, fetch_one=False, fetch_all=False):
        """Execute a query with proper connection handling"""
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            if connection is None:
                return None
                
            cursor = connection.cursor(dictionary=True)
            cursor.execute(query, params or ())
            
            if fetch_one:
                result = cursor.fetchone()
            elif fetch_all:
                result = cursor.fetchall()
            else:
                result = cursor.rowcount
                
            return result
        except Error as err:
            print(f"❌ Database query error: {err}")
            return None
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def close_connection(self):
        """Close DB connection cleanly when done."""
        if self.pool:
            self.pool.close()
            print("🔒 Database connection pool closed.")

    # ---------------- STUDENT METHODS ----------------
    def get_student_by_number(self, student_number):
        query = "SELECT * FROM students WHERE student_number = %s"
        return self.execute_query(query, (student_number,), fetch_one=True)

    def get_student_by_id(self, student_id):
        query = "SELECT * FROM students WHERE id = %s"
        return self.execute_query(query, (student_id,), fetch_one=True)

    def get_all_students(self):
        query = "SELECT * FROM students"
        result = self.execute_query(query, fetch_all=True)
        return result if result is not None else []

    # ---------------- RESIDENCE METHODS ----------------
    def get_residences(self, on_campus: bool | None = None, residence_type: str | None = None):
        base = "SELECT * FROM residences"
        clauses = []
        params = []
        if on_campus is not None:
            clauses.append("on_campus = %s")
            params.append(on_campus)
        if residence_type:
            clauses.append("residence_type = %s")
            params.append(residence_type)
        if clauses:
            base += " WHERE " + " AND ".join(clauses)
        base += " ORDER BY residence_name, block"
        
        result = self.execute_query(base, tuple(params), fetch_all=True)
        return result if result is not None else []

    def upsert_residence(self, residence_name: str, block: str = "", on_campus: bool = False,
                          residence_type: str = 'offcamp', available_rooms: int = 0,
                          restrictions: str = '') -> int | None:
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            if connection is None:
                return None
                
            cursor = connection.cursor()
            # Check if exists
            cursor.execute(
                "SELECT id FROM residences WHERE residence_name=%s AND COALESCE(block,'')=%s",
                (residence_name, block or '')
            )
            row = cursor.fetchone()
            if row:
                return int(row[0])
            cursor.execute(
                "INSERT INTO residences (residence_name, block, on_campus, residence_type, available_rooms, restrictions) VALUES (%s,%s,%s,%s,%s,%s)",
                (residence_name, block or '', on_campus, residence_type, available_rooms, restrictions)
            )
            connection.commit()
            rid = cursor.lastrowid
            return int(rid)
        except Error as err:
            print(f"❌ Error upserting residence: {err}")
            return None
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def update_student_password(self, student_id, plain_password):
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            if connection is None:
                return False
                
            cursor = connection.cursor()
            hashed_password = generate_password_hash(plain_password)
            query = "UPDATE students SET password = %s WHERE id = %s"
            cursor.execute(query, (hashed_password, student_id))
            connection.commit()
            return True
        except Error as err:
            print(f"❌ Error updating password: {err}")
            return False
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    # ---------------- APPLICATION METHODS ----------------
    def find_residence(self, residence_name: str, block: str = ""):
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            if connection is None:
                return None
                
            cursor = connection.cursor(dictionary=True)
            normalized_block = (block or '').strip()
            res = None
            if normalized_block:
                # Try exact block first
                query = "SELECT * FROM residences WHERE residence_name = %s AND block = %s LIMIT 1"
                cursor.execute(query, (residence_name.strip(), normalized_block))
                res = cursor.fetchone()
                if not res:
                    # Normalize blocks like M5 -> M-5 or AWest -> A West
                    alt_block = normalized_block
                    # Insert dash between letter prefix and digits if missing, e.g., M5 -> M-5
                    import re
                    m = re.match(r"^([A-Za-z]+)[\s-]?([0-9]+)$", normalized_block)
                    if m:
                        alt_block = f"{m.group(1)}-{m.group(2)}"
                    # Try with alt formatting
                    query = "SELECT * FROM residences WHERE residence_name = %s AND block = %s LIMIT 1"
                    cursor.execute(query, (residence_name.strip(), alt_block))
                    res = cursor.fetchone()
            if not res:
                # Fallback to any block match by residence name only (for residences like 'F3' with empty block)
                query = "SELECT * FROM residences WHERE residence_name = %s LIMIT 1"
                cursor.execute(query, (residence_name.strip(),))
                res = cursor.fetchone()
            return res
        except Error as err:
            print(f"❌ Error finding residence: {err}")
            return None
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def get_residence_by_id(self, residence_id: int):
        query = "SELECT * FROM residences WHERE id = %s"
        return self.execute_query(query, (residence_id,), fetch_one=True)

    def count_accepted_for_residence(self, residence_id: int) -> int:
        result = self.execute_query(
            "SELECT COUNT(*) as count FROM applications WHERE residence_id=%s AND status='Accepted'",
            (residence_id,),
            fetch_one=True
        )
        return int(result['count']) if result and result['count'] is not None else 0

    def get_student_applications(self, student_id):
        query = """
        SELECT a.id, r.residence_name, r.block, r.on_campus, a.status, a.apply_date AS applied_date, a.room_number
        FROM applications a
        JOIN residences r ON r.id = a.residence_id
        WHERE a.student_id = %s
        ORDER BY a.apply_date DESC
        """
        result = self.execute_query(query, (student_id,), fetch_all=True)
        return result if result is not None else []

    def get_all_applications(self):
        query = """
        SELECT a.id, a.status, a.apply_date, a.room_number,
               s.id AS student_id, s.student_number, s.first_name, s.last_name, s.email,
               r.id AS residence_id, r.residence_name, r.block, r.on_campus
        FROM applications a
        JOIN students s ON s.id = a.student_id
        JOIN residences r ON r.id = a.residence_id
        ORDER BY a.apply_date DESC
        """
        result = self.execute_query(query, fetch_all=True)
        return result if result is not None else []

    def count_existing_by_type(self, student_id: int):
        query = """
        SELECT r.on_campus AS on_campus, COUNT(*) AS cnt
        FROM applications a
        JOIN residences r ON r.id = a.residence_id
        WHERE a.student_id = %s
        GROUP BY r.on_campus
        """
        result = self.execute_query(query, (student_id,), fetch_all=True)
        counts = {True: 0, False: 0}
        if result:
            for row in result:
                counts[row['on_campus']] = row['cnt']
        return counts

    def create_applications_with_validation(self, student_id: int, selections: list):
        """
        selections: list of dicts with either {residence_id} or {residence_name, block}
        Returns (success: bool, error: str | None, created_ids: list[int])
        """
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            if connection is None:
                return False, "Database connection failed", []

            cursor = connection.cursor()

            # Resolve residence ids and classify by on/off campus
            resolved = []
            for sel in selections:
                residence_id = sel.get('residence_id')
                if not residence_id:
                    name = sel.get('residence_name')
                    block = sel.get('block', '')
                    res = self.find_residence(name, block)
                    if not res:
                        return False, f"Residence not found: {name} {block}", []
                    residence_id = res['id']
                    on_campus = res['on_campus']
                else:
                    res = self.get_residence_by_id(residence_id)
                    if not res:
                        return False, f"Residence not found: id {residence_id}", []
                    on_campus = res['on_campus']
                resolved.append((residence_id, on_campus))

            # Validate selection counts - only on-campus has limits
            sel_on = sum(1 for _, oc in resolved if oc)
            sel_off = sum(1 for _, oc in resolved if not oc)
            if sel_on > 2:
                return False, "Cannot select more than 2 on-campus residences", []
            # Off-campus has no limits

            # Validate existing counts - only check on-campus limits
            existing_counts = self.count_existing_by_type(student_id)
            if existing_counts.get(True, 0) + sel_on > 2:
                return False, "On-campus application limit exceeded (max 2)", []
            # Off-campus has no limits

            # Insert, ignoring duplicates to respect unique constraint
            created_ids = []
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            for residence_id, _ in resolved:
                try:
                    cursor.execute(
                        "INSERT INTO applications (student_id, residence_id, status, apply_date) VALUES (%s, %s, %s, %s)",
                        (student_id, residence_id, 'Pending', now)
                    )
                    created_ids.append(cursor.lastrowid)
                except Error as err:
                    if 'Duplicate' in str(err) or 'duplicate' in str(err):
                        return False, "Duplicate application for the same residence", []
                    raise
            connection.commit()
            return True, None, created_ids
        except Error as err:
            print(f"❌ Error creating applications: {err}")
            return False, "Internal error creating applications", []
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def update_application_status(self, application_id: int, status: str, room_number: str = None):
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            if connection is None:
                return False
                
            cursor = connection.cursor()
            if room_number is not None:
                cursor.execute("UPDATE applications SET status=%s, room_number=%s WHERE id=%s", (status, room_number, application_id))
            else:
                cursor.execute("UPDATE applications SET status=%s WHERE id=%s", (status, application_id))
            connection.commit()
            return True
        except Error as err:
            print(f"❌ Error updating application status: {err}")
            return False
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def get_application_with_details(self, application_id: int):
        query = """
        SELECT a.id, a.status, a.apply_date, a.room_number,
               s.id AS student_id, s.first_name, s.last_name, s.email, s.student_number,
               r.id AS residence_id, r.residence_name, r.block, r.on_campus
        FROM applications a
        JOIN students s ON s.id = a.student_id
        JOIN residences r ON r.id = a.residence_id
        WHERE a.id = %s
        """
        return self.execute_query(query, (application_id,), fetch_one=True)

    def get_accepted_offcampus_students(self, residence_id: int):
        query = """
        SELECT s.id, s.first_name, s.last_name, s.email, s.student_number
        FROM applications a
        JOIN students s ON s.id = a.student_id
        JOIN residences r ON r.id = a.residence_id
        WHERE a.status = 'Accepted' AND r.on_campus = FALSE AND r.id = %s
        ORDER BY s.last_name, s.first_name
        """
        result = self.execute_query(query, (residence_id,), fetch_all=True)
        return result if result is not None else []
