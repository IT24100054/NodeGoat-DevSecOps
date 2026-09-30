# NodeGoat Threat Model and Risk Assessment

## 1. System Overview

OWASP NodeGoat is a deliberately vulnerable web application developed using Node.js and Express, with MongoDB used as the backend database. For this DevSecOps project, the application is containerised using Docker Compose.

The system consists of two main application services:

- NodeGoat Web Application – Node.js/Express application responsible for handling user requests, authentication, business logic and interaction with the database.
- MongoDB Database – MongoDB 4.4 database used to store application data.

Users access the NodeGoat web application through a web browser using port 4000. The web application communicates with the MongoDB service through the internal Docker network using port 27017.

The threat model focuses on security threats that can occur across the application's user input, authentication, application processing, logging, configuration and database communication boundaries.
## 2. System Architecture

The NodeGoat application is deployed using Docker Compose with two main services: the web application and MongoDB.

The web application is exposed to the user through host port 4000. The MongoDB service runs on port 27017 and is accessed internally by the web application through the Docker network. MongoDB is not directly published to the host.

### Architecture Flow

User / Browser
        |
        | HTTP :4000
        v
NodeGoat Web Application
(Node.js / Express)
        |
        | MongoDB :27017
        v
MongoDB 4.4
(Database)

### 2.1 Trust Boundaries

The following trust boundaries are considered in the threat model:

- TB1 – User/Browser to Web Application: User-controlled requests and input cross into the NodeGoat application.
- TB2 – Web Application to MongoDB: Application data and database queries cross between the web application and the database service.
- TB3 – Host/External Network to Web Application: External access reaches the application through exposed port 4000.
- TB4 – Application to Logs and Configuration: Application-generated logs and configuration data may contain security-sensitive information.

## 3. STRIDE Threat Analysis

### T1 – Session Fixation / Broken Session Management

**STRIDE Category:** Spoofing / Elevation of Privilege

**Affected Component:** NodeGoat Web Application – Authentication and Session Management

**Source File:** `app/routes/session.js`

**Affected Function:** `handleLoginRequest()`

**Threat Description:**

During the login process, the application assigns the authenticated user's ID to the existing session using `req.session.userId = user._id` without regenerating the session identifier. This creates a session management weakness because the existing session identifier is retained after authentication.

**Attack Entry Point:**

The login functionality exposed through the NodeGoat web application.

**Trust Boundary:**

TB1 – User/Browser → Web Application

**Potential Security Impact:**

An attacker who is able to control or obtain a victim's session identifier could potentially use the session to access the victim's authenticated account.

**Recommended Control:**

Regenerate the session identifier after successful authentication using the application's session regeneration mechanism.

**Control Location:**

`app/routes/session.js` – `handleLoginRequest()`

**Risk Assessment:**

- Likelihood: 4/5
- Impact: 5/5
- Risk Score: 20/25
- Risk Level: Critical

### T2 – Server-Side JavaScript Injection (SSJS Injection)

**STRIDE Category:** Tampering / Elevation of Privilege

**Affected Component:** NodeGoat Web Application – Contributions Processing

**Source File:** `app/routes/contributions.js`

**Affected Function:** `handleContributionsUpdate()`

**Threat Description:**

The application uses the JavaScript `eval()` function to process user-controlled contribution values. The values received through `req.body.preTax`, `req.body.afterTax` and `req.body.roth` are passed directly to `eval()`.

This creates a server-side JavaScript injection risk because attacker-controlled input may be interpreted as JavaScript code by the server.

**Attack Entry Point:**

The contribution update functionality in the NodeGoat web application.

**Trust Boundary:**

TB1 – User/Browser → Web Application

**Potential Security Impact:**

Successful exploitation could allow unintended server-side JavaScript execution and may affect the confidentiality, integrity and security of the application.

**Recommended Control:**

Remove the use of `eval()` and apply strict numeric input validation and safe parsing methods for contribution values.

**Control Location:**

`app/routes/contributions.js` – `handleContributionsUpdate()`

**Risk Assessment:**

- Likelihood: 4/5
- Impact: 5/5
- Risk Score: 20/25
- Risk Level: Critical

### T3 – Stored XSS / Context-Sensitive Output Encoding Weakness

**STRIDE Category:** Tampering / Information Disclosure

**Affected Component:** NodeGoat Web Application – User Profile

**Source File:** `app/routes/profile.js`

**Affected Function:** `displayProfile()`

**Threat Description:**

The application processes user-controlled profile information and applies HTML encoding to the `website` value before rendering the profile. However, the source code identifies that HTML encoding is not appropriate when the same value is used in a URL context.

The code currently uses `encodeForHTML()` while the application's intended fix indicates that URL-specific encoding should be used for a URL context.

**Attack Entry Point:**

The user profile functionality where profile information is submitted and subsequently displayed.

**Trust Boundary:**

TB1 – User/Browser → Web Application

**Potential Security Impact:**

Improper context-specific output encoding may allow malicious input to be interpreted in an unintended browser context, potentially resulting in cross-site scripting and exposure of user-session information.

**Recommended Control:**

Use context-appropriate output encoding. Values inserted into HTML content should use HTML encoding, while values used in URL contexts should use URL-specific encoding. Output encoding should also be applied consistently in the relevant view.

**Control Location:**

`app/routes/profile.js` – `displayProfile()`

**Risk Assessment:**

- Likelihood: 4/5
- Impact: 4/5
- Risk Score: 16/25
- Risk Level: High

### T4 – Log Injection / Log Forging

**STRIDE Category:** Tampering / Repudiation

**Affected Component:** NodeGoat Web Application – Authentication Logging

**Source File:** `app/routes/session.js`

**Affected Function:** `handleLoginRequest()`

**Threat Description:**

The application writes a user-controlled username directly to the application log when an invalid username is submitted. The value received through the login request is included in the `console.log()` statement without sanitisation or encoding.

This creates a log injection risk because specially crafted input may manipulate the structure or appearance of log entries.

**Attack Entry Point:**

The login functionality through the username input field.

**Trust Boundary:**

TB1 – User/Browser → Web Application → Application Logs

**Potential Security Impact:**

Manipulated log entries may reduce the reliability and integrity of application logs and could make security monitoring or incident investigation more difficult.

**Recommended Control:**

Sanitise or encode user-controlled values before writing them to logs. Structured logging should also be used where possible to separate user-controlled data from log structure.

**Control Location:**

`app/routes/session.js` – `handleLoginRequest()`

**Risk Assessment:**

- Likelihood: 3/5
- Impact: 3/5
- Risk Score: 9/25
- Risk Level: Medium

### T5 – Sensitive Configuration Exposure via Logging

**STRIDE Category:** Information Disclosure

**Affected Component:** NodeGoat Web Application – Configuration Management

**Source File:** `config/config.js`

**Affected Functionality:** Application startup configuration logging

**Threat Description:**

The application prints the complete configuration object to the console during startup. The `util.inspect()` function is used to output the entire `config` object.

If the configuration contains sensitive values such as session secrets, cryptographic keys or database connection information, these values may be exposed through application or container logs.

**Attack Entry Point:**

Application startup and access to the application's console or container logs.

**Trust Boundary:**

TB4 – Application → Logs and Configuration

**Potential Security Impact:**

Sensitive configuration information exposed through logs could assist an attacker in compromising application sessions, accessing protected resources or understanding internal application configuration.

**Recommended Control:**

Do not log the complete configuration object. Sensitive configuration values should be excluded or redacted from logs. Configuration debugging should also be disabled in production environments.

**Control Location:**

`config/config.js`

**Risk Assessment:**

- Likelihood: 3/5
- Impact: 5/5
- Risk Score: 15/25
- Risk Level: High

### T6 – Regular Expression Denial of Service (ReDoS)

**STRIDE Category:** Denial of Service

**Affected Component:** NodeGoat Web Application – User Profile Validation

**Source File:** `app/routes/profile.js`

**Affected Function:** `handleProfileUpdate()`

**Threat Description:**

The application uses the following regular expression to validate the `bankRouting` input:

`/([0-9]+)+\#/`

The pattern contains nested quantifiers, which can result in excessive processing for specially crafted input. The source code itself identifies this pattern as vulnerable to catastrophic backtracking and potential CPU resource exhaustion.

**Attack Entry Point:**

The `bankRouting` input field in the user profile update functionality.

**Trust Boundary:**

TB1 – User/Browser → Web Application

**Potential Security Impact:**

A specially crafted input could cause excessive CPU consumption during regular expression processing. Repeated requests could reduce application availability and potentially result in denial of service.

**Recommended Control:**

Replace the vulnerable nested-quantifier pattern with a simpler linear-time validation pattern that does not allow catastrophic backtracking.

**Control Location:**

`app/routes/profile.js` – `handleProfileUpdate()`

**Risk Assessment:**

- Likelihood: 3/5
- Impact: 4/5
- Risk Score: 12/25
- Risk Level: High

## 4. Risk Assessment

A 5×5 risk matrix is used to assess each identified threat. Likelihood and impact are each rated from 1 to 5.

### 4.1 Risk Rating Scale

| Score | Risk Level |
|---|---|
| 1–4 | Low |
| 5–9 | Medium |
| 10–16 | High |
| 17–25 | Critical |

**Risk Score = Likelihood × Impact**

### 4.2 Risk Assessment Summary

| ID | Threat | Likelihood | Impact | Risk Score | Risk Level |
|---|---|---:|---:|---:|---|
| T1 | Session Fixation / Broken Session Management | 4 | 5 | 20 | Critical |
| T2 | Server-Side JavaScript Injection | 4 | 5 | 20 | Critical |
| T3 | Stored XSS / Context-Sensitive Output Encoding Weakness | 4 | 4 | 16 | High |
| T4 | Log Injection / Log Forging | 3 | 3 | 9 | Medium |
| T5 | Sensitive Configuration Exposure via Logging | 3 | 5 | 15 | High |
| T6 | Regular Expression Denial of Service (ReDoS) | 3 | 4 | 12 | High |

### 4.3 Risk Matrix

| Likelihood \ Impact | 1 | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|
| **5 – Almost Certain** | 5 | 10 | 15 | 20 | 25 |
| **4 – Likely** | 4 | 8 | 12 | 16 | 20 |
| **3 – Possible** | 3 | 6 | 9 | 12 | 15 |
| **2 – Unlikely** | 2 | 4 | 6 | 8 | 10 |
| **1 – Rare** | 1 | 2 | 3 | 4 | 5 |

## 5. Threat-to-Control Mapping

The following table maps each identified threat to a specific security control and its expected implementation location within the NodeGoat codebase.

| ID | Threat | Security Control | Control Location |
|---|---|---|---|
| T1 | Session Fixation / Broken Session Management | Regenerate the session identifier after successful authentication | `app/routes/session.js` – `handleLoginRequest()` |
| T2 | Server-Side JavaScript Injection | Remove `eval()` and use safe numeric parsing and strict server-side validation | `app/routes/contributions.js` – `handleContributionsUpdate()` |
| T3 | Stored XSS / Output Encoding Weakness | Apply context-appropriate output encoding for HTML and URL contexts | `app/routes/profile.js` – `displayProfile()` and relevant profile view |
| T4 | Log Injection / Log Forging | Sanitize or encode user-controlled log values and use structured logging | `app/routes/session.js` – `handleLoginRequest()` |
| T5 | Sensitive Configuration Exposure via Logging | Prevent full configuration objects from being logged; redact sensitive values and disable debug configuration logging in production | `config/config.js` |
| T6 | Regular Expression DoS (ReDoS) | Replace nested-quantifier regex with a safe validation pattern that avoids catastrophic backtracking | `app/routes/profile.js` – `handleProfileUpdate()` |

### 5.1 Control Implementation Status

The controls listed above represent the security controls required to mitigate the identified threats. Vulnerability fixes and exploit-and-fix demonstrations are handled as part of the secure coding work. The threat model therefore provides the security requirements and maps them to the relevant application components.