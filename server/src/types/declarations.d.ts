declare module 'multer' {
  import { Request } from 'express';

  interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  interface Options {
    dest?: string;
    storage?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    fileFilter?: (req: Request, file: File, cb: (error: any, acceptFile: boolean) => void) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
  }

  interface Instance {
    single(fieldname: string): any; // eslint-disable-line @typescript-eslint/no-explicit-any
    array(fieldname: string, maxCount?: number): any; // eslint-disable-line @typescript-eslint/no-explicit-any
    fields(fields: { name: string; maxCount?: number }[]): any; // eslint-disable-line @typescript-eslint/no-explicit-any
    none(): any; // eslint-disable-line @typescript-eslint/no-explicit-any
    any(): any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  function multer(options?: Options): Instance;

  namespace multer {
    function diskStorage(options: {
      destination?: string | ((req: Request, file: File, cb: (error: any, destination: string) => void) => void); // eslint-disable-line @typescript-eslint/no-explicit-any
      filename?: (req: Request, file: File, cb: (error: any, filename: string) => void) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
    }): any; // eslint-disable-line @typescript-eslint/no-explicit-any

    function memoryStorage(): any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  export = multer;
}


