import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";
import { config } from "dotenv";

// Load .env.local explicitly (dotenv/config only loads .env)
config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

const LOCATIONS = [
  {
    name: "Head Office",
    city: "Riyadh",
    latitude: 24.7136,
    longitude: 46.6753,
    geofence_radius_meters: 150,
  },
  {
    name: "Factory 1 — Riyadh",
    city: "Riyadh",
    latitude: 24.68,
    longitude: 46.71,
    geofence_radius_meters: 300,
  },
  {
    name: "Factory 2 — Mecca",
    city: "Mecca",
    latitude: 21.4225,
    longitude: 39.8262,
    geofence_radius_meters: 300,
  },
  {
    name: "Project Site — Al Ehsaa",
    city: "Al Ehsaa",
    latitude: 25.3494,
    longitude: 49.5878,
    geofence_radius_meters: 250,
  },
  {
    name: "Project Site — Al Dammam",
    city: "Al Dammam",
    latitude: 26.4207,
    longitude: 50.0888,
    geofence_radius_meters: 250,
  },
  {
    name: "Project Site — Al Qaseem",
    city: "Al Qaseem",
    latitude: 26.326,
    longitude: 43.975,
    geofence_radius_meters: 250,
  },
  {
    name: "Project Site — Mecca",
    city: "Mecca",
    latitude: 21.3891,
    longitude: 39.8579,
    geofence_radius_meters: 250,
  },
  {
    name: "Project Site — Jeddah",
    city: "Jeddah",
    latitude: 21.5433,
    longitude: 39.1728,
    geofence_radius_meters: 250,
  },
];

// ---------------------------------------------------------------------------
// Employees (70 total)
// ---------------------------------------------------------------------------
// Distribution:
//   Head Office:                6 employees  (KNZ-001 to KNZ-006)
//   Factory 1 — Riyadh:       18 employees  (KNZ-007 to KNZ-024)
//   Factory 2 — Mecca:        16 employees  (KNZ-025 to KNZ-040)
//   Project Site — Al Ehsaa:   7 employees  (KNZ-041 to KNZ-047)
//   Project Site — Al Dammam:  7 employees  (KNZ-048 to KNZ-054)
//   Project Site — Al Qaseem:  6 employees  (KNZ-055 to KNZ-060)
//   Project Site — Mecca:      5 employees  (KNZ-061 to KNZ-065)
//   Project Site — Jeddah:     5 employees  (KNZ-066 to KNZ-070)
//
// 8 supervisors (one per location), 65 active, 5 inactive
// ---------------------------------------------------------------------------

interface EmployeeSeed {
  employee_number: string;
  full_name: string;
  phone: string;
  department: string;
  position: string;
  is_active: boolean;
  _location_name: string;
}

const EMPLOYEES: EmployeeSeed[] = [
  // =========================================================================
  // HEAD OFFICE (6 employees: KNZ-001 to KNZ-006)
  // =========================================================================
  {
    employee_number: "KNZ-001",
    full_name: "Fahad Al-Dosari",
    phone: "+966-55-310-2847",
    department: "Administration",
    position: "Supervisor",
    is_active: true,
    _location_name: "Head Office",
  },
  {
    employee_number: "KNZ-002",
    full_name: "Noura Al-Otaibi",
    phone: "+966-50-482-1935",
    department: "HR",
    position: "HR Officer",
    is_active: true,
    _location_name: "Head Office",
  },
  {
    employee_number: "KNZ-003",
    full_name: "Khalil Haddadin",
    phone: "+966-53-719-4026",
    department: "Administration",
    position: "Accountant",
    is_active: true,
    _location_name: "Head Office",
  },
  {
    employee_number: "KNZ-004",
    full_name: "Reem Al-Shahrani",
    phone: "+966-54-260-8713",
    department: "HR",
    position: "Coordinator",
    is_active: true,
    _location_name: "Head Office",
  },
  {
    employee_number: "KNZ-005",
    full_name: "Omar Al-Zoubi",
    phone: "+966-56-843-1290",
    department: "Administration",
    position: "Head of Department",
    is_active: true,
    _location_name: "Head Office",
  },
  {
    employee_number: "KNZ-006",
    full_name: "Tariq Al-Mutairi",
    phone: "+966-55-172-9364",
    department: "Logistics",
    position: "Coordinator",
    is_active: true,
    _location_name: "Head Office",
  },

  // =========================================================================
  // FACTORY 1 — RIYADH (18 employees: KNZ-007 to KNZ-024)
  // =========================================================================
  {
    employee_number: "KNZ-007",
    full_name: "Mohammed Al-Rashidi",
    phone: "+966-50-934-5172",
    department: "Production",
    position: "Supervisor",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-008",
    full_name: "Sultan Al-Harbi",
    phone: "+966-53-281-6940",
    department: "Production",
    position: "Technician",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-009",
    full_name: "Ahmed Hassan",
    phone: "+966-56-407-2815",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-010",
    full_name: "Muhammad Bilal",
    phone: "+966-54-693-0248",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-011",
    full_name: "Rafiqul Islam",
    phone: "+966-55-820-4617",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-012",
    full_name: "Mahmoud Ibrahim",
    phone: "+966-50-157-3829",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-013",
    full_name: "Usman Khan",
    phone: "+966-53-946-1083",
    department: "Production",
    position: "Technician",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-014",
    full_name: "Kamal Hossain",
    phone: "+966-56-312-7594",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-015",
    full_name: "Saeed Al-Qahtani",
    phone: "+966-54-785-2036",
    department: "Engineering",
    position: "Site Engineer",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-016",
    full_name: "Abdulaziz Al-Ghamdi",
    phone: "+966-55-063-8241",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-017",
    full_name: "Habibur Rahman",
    phone: "+966-50-428-1596",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-018",
    full_name: "Ali Raza Malik",
    phone: "+966-53-150-7423",
    department: "Logistics",
    position: "Driver",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-019",
    full_name: "Mostafa Abdelfattah",
    phone: "+966-56-874-0932",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-020",
    full_name: "Faisal Al-Subaie",
    phone: "+966-54-209-5671",
    department: "Production",
    position: "Technician",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-021",
    full_name: "Shahidul Alam",
    phone: "+966-55-531-4082",
    department: "Production",
    position: "Laborer",
    is_active: false,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-022",
    full_name: "Imran Siddiqui",
    phone: "+966-50-763-2914",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-023",
    full_name: "Nasser Al-Dossary",
    phone: "+966-53-495-8107",
    department: "Operations",
    position: "Coordinator",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },
  {
    employee_number: "KNZ-024",
    full_name: "Hassan El-Sayed",
    phone: "+966-56-128-6345",
    department: "Logistics",
    position: "Driver",
    is_active: true,
    _location_name: "Factory 1 — Riyadh",
  },

  // =========================================================================
  // FACTORY 2 — MECCA (16 employees: KNZ-025 to KNZ-040)
  // =========================================================================
  {
    employee_number: "KNZ-025",
    full_name: "Bandar Al-Zahrani",
    phone: "+966-54-602-3178",
    department: "Production",
    position: "Supervisor",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-026",
    full_name: "Yasser Abdel-Azim",
    phone: "+966-55-841-0293",
    department: "Production",
    position: "Technician",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-027",
    full_name: "Zahid Hussain",
    phone: "+966-50-374-9516",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-028",
    full_name: "Jamal Al-Otaibi",
    phone: "+966-53-950-2847",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-029",
    full_name: "Mizanur Rahman",
    phone: "+966-56-213-8064",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-030",
    full_name: "Khaled Mansour",
    phone: "+966-54-786-1930",
    department: "Engineering",
    position: "Site Engineer",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-031",
    full_name: "Sajid Mehmood",
    phone: "+966-55-042-5718",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-032",
    full_name: "Abdullah Al-Shehri",
    phone: "+966-50-695-3401",
    department: "Production",
    position: "Technician",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-033",
    full_name: "Rezaul Karim",
    phone: "+966-53-518-0274",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-034",
    full_name: "Tamer Farouk",
    phone: "+966-56-439-7152",
    department: "Logistics",
    position: "Driver",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-035",
    full_name: "Waleed Al-Malki",
    phone: "+966-54-167-8503",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-036",
    full_name: "Atiqur Rahman Chowdhury",
    phone: "+966-55-283-4690",
    department: "Production",
    position: "Laborer",
    is_active: false,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-037",
    full_name: "Hamza El-Gendy",
    phone: "+966-50-906-2138",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-038",
    full_name: "Adnan Qureshi",
    phone: "+966-53-641-8075",
    department: "Operations",
    position: "Coordinator",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-039",
    full_name: "Turki Al-Harthi",
    phone: "+966-56-752-3491",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },
  {
    employee_number: "KNZ-040",
    full_name: "Naeem Akhtar",
    phone: "+966-54-390-6827",
    department: "Production",
    position: "Laborer",
    is_active: true,
    _location_name: "Factory 2 — Mecca",
  },

  // =========================================================================
  // PROJECT SITE — AL EHSAA (7 employees: KNZ-041 to KNZ-047)
  // =========================================================================
  {
    employee_number: "KNZ-041",
    full_name: "Abdulrahman Al-Jaber",
    phone: "+966-55-814-0253",
    department: "Operations",
    position: "Supervisor",
    is_active: true,
    _location_name: "Project Site — Al Ehsaa",
  },
  {
    employee_number: "KNZ-042",
    full_name: "Sameer Tawfiq",
    phone: "+966-50-237-9641",
    department: "Engineering",
    position: "Site Engineer",
    is_active: true,
    _location_name: "Project Site — Al Ehsaa",
  },
  {
    employee_number: "KNZ-043",
    full_name: "Farhan Aslam",
    phone: "+966-53-460-1827",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Al Ehsaa",
  },
  {
    employee_number: "KNZ-044",
    full_name: "Jahangir Alam",
    phone: "+966-56-183-5094",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Al Ehsaa",
  },
  {
    employee_number: "KNZ-045",
    full_name: "Hossam Abdel-Nour",
    phone: "+966-54-925-7361",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Al Ehsaa",
  },
  {
    employee_number: "KNZ-046",
    full_name: "Waseem Akram Shah",
    phone: "+966-55-648-2079",
    department: "Operations",
    position: "Technician",
    is_active: true,
    _location_name: "Project Site — Al Ehsaa",
  },
  {
    employee_number: "KNZ-047",
    full_name: "Masud Rana",
    phone: "+966-50-571-3948",
    department: "Logistics",
    position: "Driver",
    is_active: false,
    _location_name: "Project Site — Al Ehsaa",
  },

  // =========================================================================
  // PROJECT SITE — AL DAMMAM (7 employees: KNZ-048 to KNZ-054)
  // =========================================================================
  {
    employee_number: "KNZ-048",
    full_name: "Saud Al-Tamimi",
    phone: "+966-53-702-8156",
    department: "Operations",
    position: "Supervisor",
    is_active: true,
    _location_name: "Project Site — Al Dammam",
  },
  {
    employee_number: "KNZ-049",
    full_name: "Amr Soliman",
    phone: "+966-56-394-0521",
    department: "Engineering",
    position: "Site Engineer",
    is_active: true,
    _location_name: "Project Site — Al Dammam",
  },
  {
    employee_number: "KNZ-050",
    full_name: "Tanvir Ahmed",
    phone: "+966-54-816-7293",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Al Dammam",
  },
  {
    employee_number: "KNZ-051",
    full_name: "Zubair Nawaz",
    phone: "+966-55-240-9637",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Al Dammam",
  },
  {
    employee_number: "KNZ-052",
    full_name: "Ashraf Helmy",
    phone: "+966-50-983-1465",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Al Dammam",
  },
  {
    employee_number: "KNZ-053",
    full_name: "Shafikul Islam Bhuiyan",
    phone: "+966-53-157-6840",
    department: "Operations",
    position: "Technician",
    is_active: true,
    _location_name: "Project Site — Al Dammam",
  },
  {
    employee_number: "KNZ-054",
    full_name: "Yasir Mehmood Bhatti",
    phone: "+966-56-629-3108",
    department: "Logistics",
    position: "Driver",
    is_active: true,
    _location_name: "Project Site — Al Dammam",
  },

  // =========================================================================
  // PROJECT SITE — AL QASEEM (6 employees: KNZ-055 to KNZ-060)
  // =========================================================================
  {
    employee_number: "KNZ-055",
    full_name: "Mishaal Al-Anazi",
    phone: "+966-54-471-8203",
    department: "Operations",
    position: "Supervisor",
    is_active: true,
    _location_name: "Project Site — Al Qaseem",
  },
  {
    employee_number: "KNZ-056",
    full_name: "Wael Abu-Ghazaleh",
    phone: "+966-55-805-2947",
    department: "Engineering",
    position: "Site Engineer",
    is_active: true,
    _location_name: "Project Site — Al Qaseem",
  },
  {
    employee_number: "KNZ-057",
    full_name: "Mujahid Hussain Shaikh",
    phone: "+966-50-138-6574",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Al Qaseem",
  },
  {
    employee_number: "KNZ-058",
    full_name: "Abul Kalam Azad",
    phone: "+966-53-962-0431",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Al Qaseem",
  },
  {
    employee_number: "KNZ-059",
    full_name: "Ibrahim Mostafa Eid",
    phone: "+966-56-547-8120",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Al Qaseem",
  },
  {
    employee_number: "KNZ-060",
    full_name: "Kamran Javed",
    phone: "+966-54-283-5906",
    department: "Operations",
    position: "Technician",
    is_active: false,
    _location_name: "Project Site — Al Qaseem",
  },

  // =========================================================================
  // PROJECT SITE — MECCA (5 employees: KNZ-061 to KNZ-065)
  // =========================================================================
  {
    employee_number: "KNZ-061",
    full_name: "Mansour Al-Bishi",
    phone: "+966-55-319-7462",
    department: "Operations",
    position: "Supervisor",
    is_active: true,
    _location_name: "Project Site — Mecca",
  },
  {
    employee_number: "KNZ-062",
    full_name: "Muhannad Saleh",
    phone: "+966-50-654-0183",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Mecca",
  },
  {
    employee_number: "KNZ-063",
    full_name: "Riaz Ahmad Chaudhry",
    phone: "+966-53-872-4910",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Mecca",
  },
  {
    employee_number: "KNZ-064",
    full_name: "Shamsul Haque",
    phone: "+966-56-105-3687",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Mecca",
  },
  {
    employee_number: "KNZ-065",
    full_name: "Tarek Moussa",
    phone: "+966-54-738-2054",
    department: "Engineering",
    position: "Technician",
    is_active: true,
    _location_name: "Project Site — Mecca",
  },

  // =========================================================================
  // PROJECT SITE — JEDDAH (5 employees: KNZ-066 to KNZ-070)
  // =========================================================================
  {
    employee_number: "KNZ-066",
    full_name: "Nawaf Al-Johani",
    phone: "+966-55-490-6128",
    department: "Operations",
    position: "Supervisor",
    is_active: true,
    _location_name: "Project Site — Jeddah",
  },
  {
    employee_number: "KNZ-067",
    full_name: "Bassem El-Dakkak",
    phone: "+966-50-823-7549",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Jeddah",
  },
  {
    employee_number: "KNZ-068",
    full_name: "Shahzad Anwar",
    phone: "+966-53-261-4087",
    department: "Operations",
    position: "Laborer",
    is_active: true,
    _location_name: "Project Site — Jeddah",
  },
  {
    employee_number: "KNZ-069",
    full_name: "Nurul Amin Sarker",
    phone: "+966-56-974-1306",
    department: "Operations",
    position: "Technician",
    is_active: false,
    _location_name: "Project Site — Jeddah",
  },
  {
    employee_number: "KNZ-070",
    full_name: "Hazem Abdel-Wahab",
    phone: "+966-54-416-8592",
    department: "Logistics",
    position: "Driver",
    is_active: true,
    _location_name: "Project Site — Jeddah",
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Seeding Kunoz data...\n");

  // --- Check if already seeded ---
  const { count, error: countError } = await supabase
    .from("locations")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Failed to check locations: ${countError.message}`);
  }

  // Check employees too
  const { count: empCount } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true });

  if (count && count > 0 && empCount && empCount >= 70) {
    console.log(`Already seeded (${count} locations, ${empCount} employees found). Skipping.`);
    return;
  }

  // --- Insert or fetch locations ---
  let locations: { name: string; id: string }[];

  if (count && count > 0) {
    console.log("Locations already exist, fetching IDs...");
    const { data, error } = await supabase.from("locations").select("id, name");
    if (error) throw new Error(`Failed to fetch locations: ${error.message}`);
    locations = data;
  } else {
    console.log("Inserting 8 locations...");
    const { data, error: locError } = await supabase
      .from("locations")
      .insert(LOCATIONS)
      .select();

    if (locError) {
      throw new Error(`Failed to insert locations: ${locError.message}`);
    }
    locations = data;
    console.log(`  [OK] Seeded ${locations.length} locations`);
  }

  // --- Build location name -> ID map ---
  const locationMap = new Map<string, string>();
  for (const loc of locations) {
    locationMap.set(loc.name, loc.id);
  }

  // --- Insert employees ---
  console.log(`Inserting ${EMPLOYEES.length} employees...`);

  const cleanEmployees = EMPLOYEES.map(({ _location_name, ...rest }) => ({
    ...rest,
    primary_location_id: locationMap.get(_location_name) || null,
  }));

  // Insert in batches of 25 to avoid payload limits
  const BATCH_SIZE = 25;
  let totalInserted = 0;

  for (let i = 0; i < cleanEmployees.length; i += BATCH_SIZE) {
    const batch = cleanEmployees.slice(i, i + BATCH_SIZE);
    const { data: inserted, error: empError } = await supabase
      .from("employees")
      .insert(batch)
      .select();

    if (empError) {
      throw new Error(
        `Failed to insert employees (batch starting at ${i}): ${empError.message}`
      );
    }

    totalInserted += inserted.length;
    console.log(
      `  [OK] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted.length} employees`
    );
  }

  console.log(`  [OK] Seeded ${totalInserted} employees total`);

  // --- Summary ---
  console.log("\n--- Seed Summary ---");
  console.log(`Locations: ${locations.length}`);
  console.log(`Employees: ${totalInserted}`);
  console.log(
    `  Active:   ${EMPLOYEES.filter((e) => e.is_active).length}`
  );
  console.log(
    `  Inactive: ${EMPLOYEES.filter((e) => !e.is_active).length}`
  );
  console.log("\nDone!");
}

seed().catch((err) => {
  console.error("\n[FATAL] Seed failed:", err);
  process.exit(1);
});
