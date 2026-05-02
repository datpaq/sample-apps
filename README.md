# Datpaq Sample Apps

A collection of sample single-page applications that show how to integrate with the [Datpaq](https://datpaq.com) API platform.

These apps are built for developers who want to move from docs to working UI quickly. Instead of only showing raw endpoint references, this repository demonstrates practical frontend integrations for common API use cases such as time conversion, IP lookups, image processing, sample data generation, and more.

## Why This Repo Exists

Datpaq provides APIs for developers building products, internal tools, automations, and data-driven workflows. This repository exists to make adoption easier by giving you working frontend examples you can inspect, run locally, and adapt to your own use case.

Each sample app focuses on one API and typically shows:

- request setup
- API key handling
- parameter validation
- success, empty, and error states
- response rendering
- copyable request and response data
- a lightweight developer-friendly UI

## Who This Is For

This repository is intended for:

- frontend developers integrating Datpaq APIs into SPAs
- full-stack developers evaluating Datpaq for a product or workflow
- teams who prefer example-driven integration over reading docs alone
- developers building prototypes, internal tools, or production integrations

## Current Sample Apps

The repository currently includes 11 sample SPAs:

| Folder             | API / Use Case       | What it demonstrates                                      |
| ------------------ | -------------------- | --------------------------------------------------------- |
| `convert-time`     | Convert Time API     | Convert a datetime between timezones or locations         |
| `current-time`     | Current Time API     | Look up live time and timezone data for a supplied target |
| `image-processing` | Image Processing API | Send image-processing requests with operation-aware UX    |
| `ip-geolocation`   | IP Geolocation API   | Retrieve location and network details for an IP address   |
| `ip-intelligence`  | IP Intelligence API  | Surface threat, trust, proxy, VPN, and related IP signals |
| `sample-data`      | Sample Data API      | Generate mock/sample records for development and testing  |
| `unit-conversion`  | Unit Conversion API  | Convert values between measurement units                  |
| `user-avatar`      | User Avatar API      | Generate user avatar assets from names or initials        |
| `validate-ip`      | Validate IP API      | Validate and inspect IPv4 / IPv6 input                    |
| `whois`            | WHOIS API            | Look up domain registration and WHOIS data                |
| `working-days`     | Working Days API     | Calculate business-day and working-day date results       |

More sample apps will be added over time as the Datpaq API catalog expands.

## Repository Structure

Each app lives in its own top-level folder:

```text
sample-apps/
├── convert-time/
├── current-time/
├── image-processing/
├── ip-geolocation/
├── ip-intelligence/
├── sample-data/
├── unit-conversion/
├── user-avatar/
├── validate-ip/
├── whois/
├── working-days/
└── README.md
```
