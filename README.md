# mDB - Your Personal Library

Ever wondered when you read _that_ book?

## Requirements

- Git
- [Node.js](https://nodejs.org/)
- [MariaDB](https://mariadb.org/) server

## Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/MaxixSVK/mDBs
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up the database:**
   - Run the `setup.sql` script on your MariaDB server to create the required tables.
4. **Set environment variables:**
   - Copy `.env.example` to `.env` and update configuration values for your environment.
5. **Start services:**
   ```sh
   npm run env
   ```

## Security

For information on security practices and vulnerability reporting, see the [Security Policy](SECURITY.md).

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [MaxixSVK](https://maxix.sk/)
