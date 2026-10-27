import 'dotenv/config';
import dns from 'dns/promises';
import net from 'net';
import mysql from 'mysql2/promise';

const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RED    = '\x1b[31m';
const DIM    = '\x1b[2m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

const ok   = (msg) => console.log(`  ${GREEN}✔${RESET} ${msg}`);
const fail = (msg) => console.log(`  ${RED}✖${RESET} ${msg}`);
const info = (msg) => console.log(`  ${CYAN}ℹ${RESET} ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}⚠${RESET} ${msg}`);

async function runDiagnostics() {
  console.log(`\n${BOLD}${CYAN}====================================================${RESET}`);
  console.log(`${BOLD}${CYAN}       VibeTracker Database Connection Test         ${RESET}`);
  console.log(`${BOLD}${CYAN}====================================================${RESET}\n`);

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'vibetracker';
  const useSsl = process.env.DB_SSL === 'true';
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

  console.log(`${BOLD}Target Configuration (.env):${RESET}`);
  console.log(`  Host:        ${CYAN}${host}${RESET}`);
  console.log(`  Port:        ${CYAN}${port}${RESET}`);
  console.log(`  User:        ${CYAN}${user}${RESET}`);
  console.log(`  Password:    ${CYAN}${password ? '******** (' + password.length + ' chars)' : '(empty)'}${RESET}`);
  console.log(`  Database:    ${CYAN}${database}${RESET}`);
  console.log(`  SSL:         ${CYAN}${useSsl ? 'enabled' : 'disabled'}${RESET}`);
  console.log(`  Auto-Reset:  ${CYAN}${process.env.DB_RESET_ON_BOOT || 'false'}${RESET}\n`);

  let allPassed = true;

  // ── Step 1: DNS Resolution ───────────────────────────────────────────────
  console.log(`${BOLD}1. DNS Resolution Check:${RESET}`);
  let resolvedIps = [];
  try {
    const lookup = await dns.lookup(host, { all: true });
    resolvedIps = lookup.map(l => l.address);
    ok(`Resolved hostname "${host}" to: ${resolvedIps.join(', ')}`);
  } catch (err) {
    fail(`DNS Lookup failed for "${host}": ${err.code || err.message}`);
    allPassed = false;

    // Special check for AWS VPC Endpoint Service name
    if (host.includes('vpce-svc') || host.startsWith('com.amazonaws.vpce.')) {
      console.log(`\n${YELLOW}${BOLD}  [!] AWS PrivateLink Service Name Detected:${RESET}`);
      warn(`"${host}" is an AWS VPC Endpoint Service identifier.`);
      warn(`It is NOT a public internet domain name, so public DNS cannot resolve it.`);
      info(`To connect to this database from your local machine:`);
      console.log(`     a) If running inside the AWS VPC: create an Interface VPC Endpoint and use its private DNS endpoint.`);
      console.log(`     b) If testing from your laptop: you need an SSH Bastion tunnel into the VPC, or an internet-routable endpoint (e.g. AWS RDS with public access, or free TiDB Serverless).`);
    }
  }

  // ── Step 2: TCP Socket Ping ──────────────────────────────────────────────
  console.log(`\n${BOLD}2. TCP Network Reachability (Port ${port}):${RESET}`);
  if (resolvedIps.length === 0 && host !== 'localhost' && host !== '127.0.0.1') {
    fail(`Skipping TCP test because DNS resolution failed.`);
    allPassed = false;
  } else {
    const tcpSuccess = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(4000);

      socket.on('connect', () => {
        ok(`Successfully opened TCP connection to ${host}:${port}`);
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        fail(`TCP connection timed out (4000ms). The host may be behind a firewall, private VPC, or offline.`);
        socket.destroy();
        resolve(false);
      });

      socket.on('error', (err) => {
        fail(`TCP connection failed: ${err.message}`);
        resolve(false);
      });

      socket.connect(port, host);
    });

    if (!tcpSuccess) allPassed = false;
  }

  // ── Step 3: MySQL Handshake & Authentication ─────────────────────────────
  console.log(`\n${BOLD}3. MySQL Protocol Handshake & Authentication:${RESET}`);
  const sslConfig = useSsl ? { rejectUnauthorized } : undefined;
  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      ssl: sslConfig,
      connectTimeout: 5000,
    });
    ok(`Connected to MySQL server and authenticated as "${user}".`);

    const [rows] = await connection.query('SELECT 1 AS ok, VERSION() AS version, CURRENT_USER() AS cur_user, DATABASE() AS cur_db');
    const infoRow = rows[0] || {};
    info(`Server Version: ${infoRow.version || 'unknown'}`);
    info(`Authenticated:  ${infoRow.cur_user || user}`);
    info(`Selected DB:    ${infoRow.cur_db || database}`);
  } catch (err) {
    fail(`MySQL connection error: ${err.message} (code: ${err.code || 'UNKNOWN'})`);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      warn('Check DB_USER and DB_PASSWORD.');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      warn(`Database "${database}" does not exist. Set DB_SKIP_CREATE=false or create it manually.`);
    } else if (err.message.includes('SSL') || err.message.includes('handshake')) {
      warn('SSL handshake failed. Try setting DB_SSL=true and DB_SSL_REJECT_UNAUTHORIZED=false.');
    }
    allPassed = false;
  }

  // ── Step 4: Tables & Schema Check ────────────────────────────────────────
  if (connection) {
    console.log(`\n${BOLD}4. Schema & Data Inspection:${RESET}`);
    try {
      const [tables] = await connection.query('SHOW TABLES');
      const tableNames = tables.map(r => Object.values(r)[0]);
      if (tableNames.length === 0) {
        warn(`Database "${database}" is empty (no tables found).`);
        info(`Running "npm run server" with DB_RESET_ON_BOOT=true will automatically create and populate tables.`);
      } else {
        ok(`Found ${tableNames.length} tables: ${tableNames.join(', ')}`);
        if (tableNames.includes('tasks')) {
          const [[{ count }]] = await connection.query('SELECT COUNT(*) AS count FROM tasks');
          info(`Tasks table has ${count} records.`);
        }
      }
    } catch (err) {
      warn(`Could not inspect tables: ${err.message}`);
    } finally {
      await connection.end();
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}====================================================${RESET}`);
  if (allPassed) {
    console.log(`${GREEN}${BOLD}✔ ALL CHECKS PASSED! "npm run server" will connect successfully.${RESET}`);
  } else {
    console.log(`${RED}${BOLD}✖ SOME CHECKS FAILED.${RESET}`);
    console.log(`Review the messages above to fix your .env settings or network routing.`);
  }
  console.log(`${BOLD}====================================================${RESET}\n`);

  process.exit(allPassed ? 0 : 1);
}

runDiagnostics();
